export interface Card {
  id: string;
  title: string;
  details: string;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardState {
  columns: Column[];
  cards: Record<string, Card>;
}

export type BoardAction =
  | { type: "SET_BOARD"; board: BoardState }
  | { type: "RENAME_COLUMN"; columnId: string; title: string }
  | {
      type: "ADD_CARD";
      columnId: string;
      card: { title: string; details: string };
    }
  | {
      type: "EDIT_CARD";
      cardId: string;
      card: { title: string; details: string };
    }
  | { type: "DELETE_CARD"; columnId: string; cardId: string }
  | {
      type: "MOVE_CARD";
      cardId: string;
      sourceColumnId: string;
      destinationColumnId: string;
      destinationIndex: number;
    };
