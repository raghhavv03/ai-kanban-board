from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app import board_service
from app.auth import require_user
from app.board_service import NotFoundError
from app.db import get_db

router = APIRouter(prefix="/api")


class RenameColumnRequest(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def _strip_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value


class CardRequest(BaseModel):
    title: str
    details: str = ""

    @field_validator("title")
    @classmethod
    def _strip_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    @field_validator("details")
    @classmethod
    def _strip_details(cls, value: str) -> str:
        return value.strip()


class MoveCardRequest(BaseModel):
    destinationColumnId: int
    destinationIndex: int


def _current_board(db: Session, username: str):
    return board_service.get_or_create_board(db, username)


@router.get("/board")
def get_board(username: str = Depends(require_user), db: Session = Depends(get_db)):
    board = _current_board(db, username)
    return board_service.serialize_board(board)


@router.patch("/columns/{column_id}")
def rename_column(
    column_id: int,
    body: RenameColumnRequest,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    board = _current_board(db, username)
    try:
        board_service.rename_column(db, board, column_id, body.title)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Column not found")
    return board_service.serialize_board(board)


@router.post("/columns/{column_id}/cards")
def add_card(
    column_id: int,
    body: CardRequest,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    board = _current_board(db, username)
    try:
        board_service.add_card(db, board, column_id, body.title, body.details)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Column not found")
    return board_service.serialize_board(board)


@router.patch("/cards/{card_id}")
def edit_card(
    card_id: int,
    body: CardRequest,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    board = _current_board(db, username)
    try:
        board_service.edit_card(db, board, card_id, body.title, body.details)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Card not found")
    return board_service.serialize_board(board)


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    board = _current_board(db, username)
    try:
        board_service.delete_card(db, board, card_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Card not found")
    return board_service.serialize_board(board)


@router.post("/cards/{card_id}/move")
def move_card(
    card_id: int,
    body: MoveCardRequest,
    username: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    board = _current_board(db, username)
    try:
        board_service.move_card(
            db, board, card_id, body.destinationColumnId, body.destinationIndex
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Card or column not found")
    return board_service.serialize_board(board)
