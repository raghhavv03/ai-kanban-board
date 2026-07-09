from unittest.mock import patch

import pytest

from app.ai_client import AIRequestError
from app.board_service import apply_operations, get_or_create_board, serialize_board


def test_apply_operations_create_card(db_session):
    board = get_or_create_board(db_session, "user")
    todo_column = next(c for c in board.columns if c.title == "To Do")

    changed = apply_operations(
        db_session,
        board,
        [
            {
                "type": "create_card",
                "column_id": str(todo_column.id),
                "title": "AI task",
                "details": "Created by AI",
            }
        ],
    )

    assert changed is True
    db_session.refresh(board)
    serialized = serialize_board(board)
    titles = [serialized["cards"][cid]["title"] for cid in serialized["cards"]]
    assert "AI task" in titles


def test_apply_operations_invalid_operation_skips_invalid_only(db_session):
    board = get_or_create_board(db_session, "user")
    todo_column = next(c for c in board.columns if c.title == "To Do")
    before_count = len(serialize_board(board)["cards"])

    changed = apply_operations(
        db_session,
        board,
        [
            {"type": "create_card", "column_id": "999", "title": "Nope"},
            {
                "type": "create_card",
                "column_id": str(todo_column.id),
                "title": "Valid card",
            },
        ],
    )

    assert changed is True
    serialized = serialize_board(board)
    assert len(serialized["cards"]) == before_count + 1
    titles = [serialized["cards"][cid]["title"] for cid in serialized["cards"]]
    assert "Valid card" in titles
    assert "Nope" not in titles


def test_apply_operations_create_card_by_column_title(db_session):
    board = get_or_create_board(db_session, "user")

    changed = apply_operations(
        db_session,
        board,
        [
            {
                "type": "create_card",
                "column_title": "To Do",
                "title": "Title lookup card",
            }
        ],
    )

    assert changed is True
    serialized = serialize_board(board)
    titles = [serialized["cards"][cid]["title"] for cid in serialized["cards"]]
    assert "Title lookup card" in titles


def test_apply_operations_null_details_becomes_empty_string(db_session):
    board = get_or_create_board(db_session, "user")
    todo_column = next(c for c in board.columns if c.title == "To Do")

    changed = apply_operations(
        db_session,
        board,
        [
            {
                "type": "create_card",
                "column_id": str(todo_column.id),
                "column_title": None,
                "title": "No details card",
                "details": None,
            }
        ],
    )

    assert changed is True
    serialized = serialize_board(board)
    card = next(
        c for c in serialized["cards"].values() if c["title"] == "No details card"
    )
    assert card["details"] == ""


def test_apply_operations_null_title_is_rejected(db_session):
    board = get_or_create_board(db_session, "user")
    todo_column = next(c for c in board.columns if c.title == "To Do")
    before_count = len(serialize_board(board)["cards"])

    changed = apply_operations(
        db_session,
        board,
        [
            {
                "type": "create_card",
                "column_id": str(todo_column.id),
                "title": None,
                "details": None,
            }
        ],
    )

    assert changed is False
    serialized = serialize_board(board)
    assert len(serialized["cards"]) == before_count
    titles = [c["title"] for c in serialized["cards"].values()]
    assert "None" not in titles


def test_chat_requires_auth(raw_client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    res = raw_client.post("/api/chat", json={"message": "hi"})
    assert res.status_code == 401


def test_chat_reply_only(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    with patch(
        "app.chat.complete_structured",
        return_value={"reply": "Hello!", "operations": []},
    ):
        res = client.post("/api/chat", json={"message": "hello"})

    assert res.status_code == 200
    body = res.json()
    assert body["reply"] == "Hello!"
    assert body["board_changed"] is False


def test_chat_applies_board_update(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    board = client.get("/api/board").json()
    todo = next(c for c in board["columns"] if c["title"] == "To Do")

    with patch(
        "app.chat.complete_structured",
        return_value={
            "reply": "Added the card.",
            "operations": [
                {
                    "type": "create_card",
                    "column_id": todo["id"],
                    "title": "From chat",
                    "details": "",
                }
            ],
        },
    ):
        res = client.post("/api/chat", json={"message": "add a card"})

    assert res.status_code == 200
    assert res.json()["board_changed"] is True

    updated = client.get("/api/board").json()
    titles = [updated["cards"][cid]["title"] for cid in updated["cards"]]
    assert "From chat" in titles


def test_chat_malformed_operations_do_not_corrupt_board(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    before = client.get("/api/board").json()

    with patch(
        "app.chat.complete_structured",
        return_value={
            "reply": "Tried to update.",
            "operations": [{"type": "delete_card", "card_id": "99999"}],
        },
    ):
        res = client.post("/api/chat", json={"message": "delete something"})

    assert res.status_code == 200
    assert res.json()["board_changed"] is False
    after = client.get("/api/board").json()
    assert after == before


def test_chat_repairs_incomplete_create_card_from_user_message(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    with patch(
        "app.chat.complete_structured",
        return_value={
            "reply": "Added the card.",
            "operations": [{"type": "create_card", "title": "Repaired card"}],
        },
    ):
        res = client.post(
            "/api/chat",
            json={"message": "Add Repaired card to To Do"},
        )

    assert res.status_code == 200
    assert res.json()["board_changed"] is True

    updated = client.get("/api/board").json()
    titles = [updated["cards"][cid]["title"] for cid in updated["cards"]]
    assert "Repaired card" in titles


def test_chat_limits_history_to_ten_messages(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"msg {i}"}
        for i in range(12)
    ]

    with patch("app.chat.complete_structured") as complete:
        complete.return_value = {"reply": "ok", "operations": []}
        res = client.post(
            "/api/chat", json={"message": "latest", "history": history}
        )

    assert res.status_code == 200
    sent_messages = complete.call_args[0][0]
    history_messages = [
        m for m in sent_messages if m["role"] in {"user", "assistant"}
    ]
    assert len(history_messages) == 11
    assert history_messages[-1]["content"] == "latest"


def test_chat_missing_api_key(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    res = client.post("/api/chat", json={"message": "hi"})
    assert res.status_code == 503


def test_chat_openai_error(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    with patch(
        "app.chat.complete_structured",
        side_effect=AIRequestError("upstream failed"),
    ):
        res = client.post("/api/chat", json={"message": "hi"})

    assert res.status_code == 502


def test_complete_structured_parses_json(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {"message": {"content": '{"reply":"Hi","operations":[]}'}}
                ]
            }

    with patch("app.ai_client.httpx.post", return_value=FakeResponse()):
        from app.ai_client import complete_structured
        from app.chat_schema import CHAT_RESPONSE_SCHEMA

        result = complete_structured(
            [{"role": "user", "content": "hi"}],
            CHAT_RESPONSE_SCHEMA,
            schema_name="chat_response",
        )

    assert result == {"reply": "Hi", "operations": []}
