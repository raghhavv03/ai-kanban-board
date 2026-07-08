from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Board, Card, Column, User

# Seed data mirroring the frontend demo (dummyData.ts): (column title, [(card title, details)]).
SEED: list[tuple[str, list[tuple[str, str]]]] = [
    (
        "Backlog",
        [
            ("Research competitors", "Analyze top 5 Kanban tools and note key UX patterns."),
            ("Define user personas", "Create profiles for project managers and team leads."),
        ],
    ),
    (
        "To Do",
        [
            ("Design board layout", "Wireframe the column and card structure."),
            ("Set up project repo", "Initialize Next.js app with TypeScript and Tailwind."),
        ],
    ),
    (
        "In Progress",
        [
            ("Build card component", "Implement draggable cards with title and details."),
            ("Implement drag and drop", "Wire up @dnd-kit for cross-column card movement."),
        ],
    ),
    ("Review", [("Write unit tests", "Cover reducer actions and component interactions.")]),
    (
        "Done",
        [
            ("Polish UI styling", "Apply brand colors and refine spacing."),
            ("Deploy MVP", "Ship the board and gather initial feedback."),
        ],
    ),
]


class NotFoundError(Exception):
    """Raised when a column or card does not exist in the given board."""


def get_or_create_board(db: Session, username: str) -> Board:
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        user = User(username=username)
        db.add(user)
        db.flush()

    board = db.scalar(
        select(Board).where(Board.user_id == user.id).order_by(Board.id)
    )
    if board is None:
        board = _seed_board(db, user)
    return board


def reset_user_board(db: Session, username: str) -> Board:
    """Delete the user's board(s) and reseed. Used only by the e2e test reset."""
    user = db.scalar(select(User).where(User.username == username))
    if user is not None:
        for board in list(user.boards):
            db.delete(board)
        db.commit()
    return get_or_create_board(db, username)


def _seed_board(db: Session, user: User) -> Board:
    board = Board(user_id=user.id, name="My Board")
    db.add(board)
    db.flush()
    for col_pos, (title, cards) in enumerate(SEED):
        column = Column(board_id=board.id, title=title, position=col_pos)
        db.add(column)
        db.flush()
        for card_pos, (card_title, details) in enumerate(cards):
            db.add(
                Card(
                    column_id=column.id,
                    title=card_title,
                    details=details,
                    position=card_pos,
                )
            )
    db.commit()
    return board


def serialize_board(board: Board) -> dict:
    columns = []
    cards: dict[str, dict] = {}
    for column in sorted(board.columns, key=lambda c: c.position):
        card_ids = []
        for card in sorted(column.cards, key=lambda c: c.position):
            card_id = str(card.id)
            card_ids.append(card_id)
            cards[card_id] = {
                "id": card_id,
                "title": card.title,
                "details": card.details,
            }
        columns.append(
            {"id": str(column.id), "title": column.title, "cardIds": card_ids}
        )
    return {"columns": columns, "cards": cards}


def _get_column(board: Board, column_id: int) -> Column:
    for column in board.columns:
        if column.id == column_id:
            return column
    raise NotFoundError(f"Column {column_id} not found in board")


def _get_card(board: Board, card_id: int) -> Card:
    for column in board.columns:
        for card in column.cards:
            if card.id == card_id:
                return card
    raise NotFoundError(f"Card {card_id} not found in board")


def rename_column(db: Session, board: Board, column_id: int, title: str) -> None:
    column = _get_column(board, column_id)
    column.title = title
    db.commit()


def add_card(
    db: Session, board: Board, column_id: int, title: str, details: str
) -> None:
    column = _get_column(board, column_id)
    card = Card(
        column_id=column.id,
        title=title,
        details=details,
        position=len(column.cards),
    )
    db.add(card)
    db.commit()


def edit_card(
    db: Session, board: Board, card_id: int, title: str, details: str
) -> None:
    card = _get_card(board, card_id)
    card.title = title
    card.details = details
    db.commit()


def delete_card(db: Session, board: Board, card_id: int) -> None:
    card = _get_card(board, card_id)
    column = _get_column(board, card.column_id)
    db.delete(card)
    db.flush()
    remaining = [c for c in sorted(column.cards, key=lambda c: c.position) if c.id != card_id]
    for index, remaining_card in enumerate(remaining):
        remaining_card.position = index
    db.commit()


def move_card(
    db: Session,
    board: Board,
    card_id: int,
    destination_column_id: int,
    destination_index: int,
) -> None:
    card = _get_card(board, card_id)
    source_column = _get_column(board, card.column_id)
    destination_column = _get_column(board, destination_column_id)

    source_cards = [
        c
        for c in sorted(source_column.cards, key=lambda c: c.position)
        if c.id != card_id
    ]

    if source_column.id == destination_column.id:
        destination_cards = source_cards
    else:
        destination_cards = sorted(destination_column.cards, key=lambda c: c.position)

    index = max(0, min(destination_index, len(destination_cards)))
    destination_cards.insert(index, card)
    card.column_id = destination_column.id

    if source_column.id != destination_column.id:
        for position, source_card in enumerate(source_cards):
            source_card.position = position
    for position, destination_card in enumerate(destination_cards):
        destination_card.position = position

    db.commit()


class OperationError(Exception):
    """Raised when an AI board operation is invalid."""


def _parse_positive_int(value: str | int | None, field: str) -> int:
    if value is None:
        raise OperationError(f"{field} is required")
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise OperationError(f"{field} must be a numeric id") from exc
    if parsed <= 0:
        raise OperationError(f"{field} must be positive")
    return parsed


def _resolve_column_id(
    board: Board,
    *,
    column_id: str | int | None = None,
    column_title: str | None = None,
) -> int:
    candidates: list[str] = []
    if column_id is not None and str(column_id).strip():
        candidates.append(str(column_id).strip())
    if column_title is not None and str(column_title).strip():
        candidates.append(str(column_title).strip())

    if not candidates:
        raise OperationError("column_id or column_title is required")

    for raw in candidates:
        try:
            parsed_id = int(raw)
            return _get_column(board, parsed_id).id
        except (ValueError, NotFoundError):
            pass

        lowered = raw.lower()
        for column in board.columns:
            if column.title.lower() == lowered:
                return column.id

    raise OperationError(f"Could not resolve column from {candidates!r}")


def _validate_operation(board: Board, operation: dict) -> dict:
    if not isinstance(operation, dict):
        raise OperationError("operation must be an object")

    op_type = operation.get("type")
    if op_type not in {
        "create_card",
        "edit_card",
        "delete_card",
        "move_card",
        "rename_column",
    }:
        raise OperationError(f"unknown operation type: {op_type!r}")

    if op_type == "create_card":
        column_id = _resolve_column_id(
            board,
            column_id=operation.get("column_id"),
            column_title=operation.get("column_title"),
        )
        title = str(operation.get("title", "")).strip()
        if not title:
            raise OperationError("create_card requires a non-blank title")
        return {
            "type": op_type,
            "column_id": column_id,
            "title": title,
            "details": str(operation.get("details", "")).strip(),
        }

    if op_type == "edit_card":
        card_id = _parse_positive_int(operation.get("card_id"), "card_id")
        try:
            _get_card(board, card_id)
        except NotFoundError as exc:
            raise OperationError(str(exc)) from exc
        title = str(operation.get("title", "")).strip()
        if not title:
            raise OperationError("edit_card requires a non-blank title")
        return {
            "type": op_type,
            "card_id": card_id,
            "title": title,
            "details": str(operation.get("details", "")).strip(),
        }

    if op_type == "delete_card":
        card_id = _parse_positive_int(operation.get("card_id"), "card_id")
        try:
            _get_card(board, card_id)
        except NotFoundError as exc:
            raise OperationError(str(exc)) from exc
        return {"type": op_type, "card_id": card_id}

    if op_type == "move_card":
        card_id = _parse_positive_int(operation.get("card_id"), "card_id")
        destination_column_id = _resolve_column_id(
            board,
            column_id=operation.get("destination_column_id"),
            column_title=operation.get("destination_column_title"),
        )
        try:
            card = _get_card(board, card_id)
            destination_column = _get_column(board, destination_column_id)
        except NotFoundError as exc:
            raise OperationError(str(exc)) from exc
        destination_index = operation.get("destination_index")
        if not isinstance(destination_index, int) or destination_index < 0:
            raise OperationError("move_card requires a non-negative destination_index")
        if card.column_id == destination_column.id:
            max_index = len([c for c in destination_column.cards if c.id != card_id])
        else:
            max_index = len(destination_column.cards)
        if destination_index > max_index:
            raise OperationError("destination_index is out of range")
        return {
            "type": op_type,
            "card_id": card_id,
            "destination_column_id": destination_column_id,
            "destination_index": destination_index,
        }

    column_id = _resolve_column_id(
        board,
        column_id=operation.get("column_id"),
        column_title=operation.get("column_title"),
    )
    title = str(operation.get("title", "")).strip()
    if not title:
        raise OperationError("rename_column requires a non-blank title")
    return {"type": op_type, "column_id": column_id, "title": title}


def _apply_operation(db: Session, board: Board, operation: dict) -> None:
    op_type = operation["type"]
    if op_type == "create_card":
        add_card(
            db,
            board,
            operation["column_id"],
            operation["title"],
            operation["details"],
        )
    elif op_type == "edit_card":
        edit_card(
            db,
            board,
            operation["card_id"],
            operation["title"],
            operation["details"],
        )
    elif op_type == "delete_card":
        delete_card(db, board, operation["card_id"])
    elif op_type == "move_card":
        move_card(
            db,
            board,
            operation["card_id"],
            operation["destination_column_id"],
            operation["destination_index"],
        )
    else:
        rename_column(db, board, operation["column_id"], operation["title"])


def apply_operations(db: Session, board: Board, operations: list) -> bool:
    """Apply valid AI board operations; skip invalid ones without corrupting the board."""
    if not operations:
        return False

    changed = False
    for operation in operations:
        try:
            validated = _validate_operation(board, operation)
            _apply_operation(db, board, validated)
            db.refresh(board)
            changed = True
        except OperationError:
            continue

    return changed
