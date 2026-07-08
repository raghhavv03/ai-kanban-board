import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app import board_service
from app.ai_client import (
    AIConfigError,
    AIRequestError,
    DEFAULT_MODEL,
    FALLBACK_MODEL,
    complete_structured,
)
from app.auth import require_user
from app.chat_schema import CHAT_RESPONSE_SCHEMA, SYSTEM_PROMPT
from app.db import get_db

router = APIRouter(prefix="/api", tags=["chat"])

MAX_HISTORY_MESSAGES = 10
VALID_ROLES = {"user", "assistant"}


class HistoryMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def _valid_role(cls, value: str) -> str:
        if value not in VALID_ROLES:
            raise ValueError("role must be user or assistant")
        return value

    @field_validator("content")
    @classmethod
    def _strip_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = Field(default_factory=list)

    @field_validator("message")
    @classmethod
    def _strip_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value

    @field_validator("history")
    @classmethod
    def _limit_history(cls, value: list[HistoryMessage]) -> list[HistoryMessage]:
        if len(value) > MAX_HISTORY_MESSAGES:
            return value[-MAX_HISTORY_MESSAGES:]
        return value


def _build_messages(board_json: dict, request: ChatRequest) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": f"Current board JSON:\n{json.dumps(board_json, indent=2)}",
        },
    ]
    for item in request.history:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": request.message})
    return messages


def _call_structured(messages: list[dict[str, str]]) -> tuple[dict, str]:
    try:
        return complete_structured(
            messages, CHAT_RESPONSE_SCHEMA, schema_name="chat_response"
        ), DEFAULT_MODEL
    except AIRequestError:
        return complete_structured(
            messages,
            CHAT_RESPONSE_SCHEMA,
            model=FALLBACK_MODEL,
            schema_name="chat_response",
        ), FALLBACK_MODEL


def _repair_operations(
    board_json: dict, user_message: str, operations: list
) -> list:
    """Fill in missing column references when the model returns incomplete operations."""
    columns_by_title = {
        column["title"].lower(): column for column in board_json["columns"]
    }
    message_lower = user_message.lower()
    repaired: list = []

    for operation in operations:
        if not isinstance(operation, dict):
            repaired.append(operation)
            continue

        op = dict(operation)
        op_type = op.get("type")

        if op_type == "create_card" and not op.get("column_id") and not op.get(
            "column_title"
        ):
            for title, column in columns_by_title.items():
                if title in message_lower:
                    op["column_title"] = column["title"]
                    break

        if op_type == "move_card" and not op.get(
            "destination_column_id"
        ) and not op.get("destination_column_title"):
            for title, column in columns_by_title.items():
                if title in message_lower:
                    op["destination_column_title"] = column["title"]
                    break

        if op_type == "rename_column" and not op.get("column_id") and not op.get(
            "column_title"
        ):
            for title, column in columns_by_title.items():
                if title in message_lower:
                    op["column_title"] = column["title"]
                    break

        repaired.append(op)

    return repaired


def _extract_reply_and_operations(data: dict) -> tuple[str, list]:
    reply = data.get("reply")
    operations = data.get("operations", [])
    if operations is None:
        operations = []
    if not isinstance(operations, list):
        raise AIRequestError("Structured output operations must be a list")

    if not isinstance(reply, str) or not reply.strip():
        if operations:
            reply = "Done."
        else:
            raise AIRequestError("Structured output missing reply")

    return reply.strip(), operations


@router.post("/chat")
def chat(
    body: ChatRequest,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    board = board_service.get_or_create_board(db, username)
    board_json = board_service.serialize_board(board)
    messages = _build_messages(board_json, body)

    try:
        structured, model = _call_structured(messages)
        reply, operations = _extract_reply_and_operations(structured)
        operations = _repair_operations(board_json, body.message, operations)
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    board_changed = False
    if operations:
        board_changed = board_service.apply_operations(db, board, operations)

    return {
        "reply": reply,
        "board_changed": board_changed,
        "model": model,
    }
