import { arrayMove } from "@dnd-kit/sortable";
import type { BoardAction, BoardState } from "@/types/board";
import { initialBoardState } from "@/data/dummyData";

function generateId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function boardReducer(
  state: BoardState,
  action: BoardAction
): BoardState {
  switch (action.type) {
    case "RENAME_COLUMN": {
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === action.columnId ? { ...col, title: action.title } : col
        ),
      };
    }

    case "ADD_CARD": {
      const trimmedTitle = action.card.title.trim();
      if (!trimmedTitle) return state;

      const id = generateId();
      const newCard = {
        id,
        title: trimmedTitle,
        details: action.card.details.trim(),
      };

      return {
        ...state,
        cards: { ...state.cards, [id]: newCard },
        columns: state.columns.map((col) =>
          col.id === action.columnId
            ? { ...col, cardIds: [...col.cardIds, id] }
            : col
        ),
      };
    }

    case "EDIT_CARD": {
      const existing = state.cards[action.cardId];
      const trimmedTitle = action.card.title.trim();
      if (!existing || !trimmedTitle) return state;

      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: {
            ...existing,
            title: trimmedTitle,
            details: action.card.details.trim(),
          },
        },
      };
    }

    case "DELETE_CARD": {
      const { [action.cardId]: _, ...remainingCards } = state.cards;
      return {
        ...state,
        cards: remainingCards,
        columns: state.columns.map((col) =>
          col.id === action.columnId
            ? {
                ...col,
                cardIds: col.cardIds.filter((id) => id !== action.cardId),
              }
            : col
        ),
      };
    }

    case "MOVE_CARD": {
      const { cardId, sourceColumnId, destinationColumnId, destinationIndex } =
        action;

      if (sourceColumnId === destinationColumnId) {
        return {
          ...state,
          columns: state.columns.map((col) => {
            if (col.id !== sourceColumnId) return col;
            const oldIndex = col.cardIds.indexOf(cardId);
            if (oldIndex === -1 || oldIndex === destinationIndex) return col;
            return {
              ...col,
              cardIds: arrayMove(col.cardIds, oldIndex, destinationIndex),
            };
          }),
        };
      }

      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id === sourceColumnId) {
            return {
              ...col,
              cardIds: col.cardIds.filter((id) => id !== cardId),
            };
          }
          if (col.id === destinationColumnId) {
            const newCardIds = [...col.cardIds];
            newCardIds.splice(destinationIndex, 0, cardId);
            return { ...col, cardIds: newCardIds };
          }
          return col;
        }),
      };
    }

    default:
      return state;
  }
}

export { initialBoardState };
