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
