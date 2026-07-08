from app import board_service


def _board(client):
    res = client.get("/api/board")
    assert res.status_code == 200
    return res.json()


# --- seeding / data layer ---


def test_get_or_create_board_seeds_once(db_session):
    board = board_service.get_or_create_board(db_session, "user")
    data = board_service.serialize_board(board)
    assert [c["title"] for c in data["columns"]] == [
        "Backlog",
        "To Do",
        "In Progress",
        "Review",
        "Done",
    ]
    assert len(data["cards"]) == 9

    # Calling again returns the same board (no duplicate seeding).
    again = board_service.get_or_create_board(db_session, "user")
    assert again.id == board.id
    assert len(board_service.serialize_board(again)["cards"]) == 9


# --- auth enforcement ---


def test_board_routes_require_auth(raw_client):
    assert raw_client.get("/api/board").status_code == 401
    assert raw_client.patch("/api/columns/1", json={"title": "X"}).status_code == 401
    assert raw_client.delete("/api/cards/1").status_code == 401


# --- GET board ---


def test_get_board_returns_seeded_board(client):
    data = _board(client)
    assert [c["title"] for c in data["columns"]] == [
        "Backlog",
        "To Do",
        "In Progress",
        "Review",
        "Done",
    ]
    assert len(data["columns"][0]["cardIds"]) == 2
    first_card_id = data["columns"][0]["cardIds"][0]
    assert data["cards"][first_card_id]["title"] == "Research competitors"


# --- rename column ---


def test_rename_column(client):
    board = _board(client)
    col_id = board["columns"][1]["id"]
    res = client.patch(f"/api/columns/{col_id}", json={"title": "Ready"})
    assert res.status_code == 200
    assert res.json()["columns"][1]["title"] == "Ready"
    # persisted
    assert _board(client)["columns"][1]["title"] == "Ready"


def test_rename_missing_column_404(client):
    assert client.patch("/api/columns/9999", json={"title": "X"}).status_code == 404


def test_rename_blank_title_rejected(client):
    board = _board(client)
    col_id = board["columns"][0]["id"]
    assert client.patch(f"/api/columns/{col_id}", json={"title": "   "}).status_code == 422


# --- add card ---


def test_add_card(client):
    board = _board(client)
    col_id = board["columns"][3]["id"]  # Review starts with 1 card
    res = client.post(
        f"/api/columns/{col_id}/cards", json={"title": "New task", "details": "d"}
    )
    assert res.status_code == 200
    data = res.json()
    review = next(c for c in data["columns"] if c["id"] == col_id)
    assert len(review["cardIds"]) == 2
    new_id = review["cardIds"][-1]
    assert data["cards"][new_id] == {"id": new_id, "title": "New task", "details": "d"}


def test_add_card_blank_title_rejected(client):
    board = _board(client)
    col_id = board["columns"][0]["id"]
    assert (
        client.post(f"/api/columns/{col_id}/cards", json={"title": "  "}).status_code
        == 422
    )


def test_add_card_missing_column_404(client):
    assert (
        client.post("/api/columns/9999/cards", json={"title": "x"}).status_code == 404
    )


# --- edit card ---


def test_edit_card(client):
    board = _board(client)
    card_id = board["columns"][0]["cardIds"][0]
    res = client.patch(
        f"/api/cards/{card_id}", json={"title": "Updated", "details": "new"}
    )
    assert res.status_code == 200
    assert res.json()["cards"][card_id] == {
        "id": card_id,
        "title": "Updated",
        "details": "new",
    }
    assert _board(client)["cards"][card_id]["title"] == "Updated"


def test_edit_missing_card_404(client):
    assert client.patch("/api/cards/9999", json={"title": "x"}).status_code == 404


# --- delete card ---


def test_delete_card_and_reindex(client):
    board = _board(client)
    col = board["columns"][0]
    first, second = col["cardIds"]
    res = client.delete(f"/api/cards/{first}")
    assert res.status_code == 200
    data = res.json()
    assert first not in data["cards"]
    remaining = next(c for c in data["columns"] if c["id"] == col["id"])["cardIds"]
    assert remaining == [second]


def test_delete_missing_card_404(client):
    assert client.delete("/api/cards/9999").status_code == 404


# --- move card ---


def test_move_card_within_column(client):
    board = _board(client)
    col = board["columns"][0]
    first, second = col["cardIds"]
    res = client.post(
        f"/api/cards/{first}/move",
        json={"destinationColumnId": int(col["id"]), "destinationIndex": 1},
    )
    assert res.status_code == 200
    reordered = next(c for c in res.json()["columns"] if c["id"] == col["id"])["cardIds"]
    assert reordered == [second, first]


def test_move_card_across_columns(client):
    board = _board(client)
    source = board["columns"][0]
    dest = board["columns"][2]
    moving = source["cardIds"][0]
    res = client.post(
        f"/api/cards/{moving}/move",
        json={"destinationColumnId": int(dest["id"]), "destinationIndex": 0},
    )
    assert res.status_code == 200
    data = res.json()
    new_source = next(c for c in data["columns"] if c["id"] == source["id"])["cardIds"]
    new_dest = next(c for c in data["columns"] if c["id"] == dest["id"])["cardIds"]
    assert moving not in new_source
    assert new_dest[0] == moving
    assert len(new_dest) == 3


def test_move_card_missing_404(client):
    board = _board(client)
    dest = board["columns"][0]["id"]
    res = client.post(
        f"/api/cards/9999/move",
        json={"destinationColumnId": int(dest), "destinationIndex": 0},
    )
    assert res.status_code == 404


# --- test reset endpoint (guarded) ---


def test_reset_disabled_by_default(client, monkeypatch):
    monkeypatch.delenv("ALLOW_TEST_RESET", raising=False)
    assert client.post("/api/test/reset").status_code == 404


def test_reset_reseeds_when_enabled(client, monkeypatch):
    monkeypatch.setenv("ALLOW_TEST_RESET", "1")
    board = _board(client)
    card_id = board["columns"][0]["cardIds"][0]
    client.delete(f"/api/cards/{card_id}")
    assert len(_board(client)["cards"]) == 8

    res = client.post("/api/test/reset")
    assert res.status_code == 200
    assert len(res.json()["cards"]) == 9


# --- persistence across requests ---


def test_changes_persist(client):
    board = _board(client)
    col_id = board["columns"][4]["id"]
    client.post(f"/api/columns/{col_id}/cards", json={"title": "Persisted"})
    reread = _board(client)
    done = next(c for c in reread["columns"] if c["id"] == col_id)
    titles = [reread["cards"][cid]["title"] for cid in done["cardIds"]]
    assert "Persisted" in titles
