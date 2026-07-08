import { describe, it, expect } from "vitest";
import { boardReducer, initialBoardState } from "./boardReducer";

describe("boardReducer", () => {
  it("returns initial state with dummy data", () => {
    expect(initialBoardState.columns).toHaveLength(5);
    expect(Object.keys(initialBoardState.cards)).toHaveLength(9);
  });

  it("renames a column", () => {
    const result = boardReducer(initialBoardState, {
      type: "RENAME_COLUMN",
      columnId: "col-todo",
      title: "Ready",
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.title).toBe("Ready");
  });

  it("adds a card to a column", () => {
    const result = boardReducer(initialBoardState, {
      type: "ADD_CARD",
      columnId: "col-todo",
      card: { title: "New task", details: "Some details" },
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.cardIds).toHaveLength(3);
    const newCardId = column!.cardIds[2];
    expect(result.cards[newCardId]).toEqual({
      id: newCardId,
      title: "New task",
      details: "Some details",
    });
  });

  it("rejects adding a card with empty title", () => {
    const result = boardReducer(initialBoardState, {
      type: "ADD_CARD",
      columnId: "col-todo",
      card: { title: "   ", details: "details" },
    });
    expect(result).toEqual(initialBoardState);
  });

  it("edits a card's title and details", () => {
    const result = boardReducer(initialBoardState, {
      type: "EDIT_CARD",
      cardId: "card-3",
      card: { title: "Updated title", details: "Updated details" },
    });
    expect(result.cards["card-3"]).toEqual({
      id: "card-3",
      title: "Updated title",
      details: "Updated details",
    });
  });

  it("rejects editing a card to an empty title", () => {
    const result = boardReducer(initialBoardState, {
      type: "EDIT_CARD",
      cardId: "card-3",
      card: { title: "   ", details: "details" },
    });
    expect(result).toEqual(initialBoardState);
  });

  it("deletes a card from column and cards map", () => {
    const result = boardReducer(initialBoardState, {
      type: "DELETE_CARD",
      columnId: "col-todo",
      cardId: "card-3",
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.cardIds).not.toContain("card-3");
    expect(result.cards["card-3"]).toBeUndefined();
  });

  it("moves a card within the same column", () => {
    const result = boardReducer(initialBoardState, {
      type: "MOVE_CARD",
      cardId: "card-3",
      sourceColumnId: "col-todo",
      destinationColumnId: "col-todo",
      destinationIndex: 2,
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.cardIds).toEqual(["card-4", "card-3"]);
  });

  it("moves a card down within the same column", () => {
    const result = boardReducer(initialBoardState, {
      type: "MOVE_CARD",
      cardId: "card-3",
      sourceColumnId: "col-todo",
      destinationColumnId: "col-todo",
      destinationIndex: 1,
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.cardIds).toEqual(["card-4", "card-3"]);
  });

  it("moves a card up within the same column", () => {
    const result = boardReducer(initialBoardState, {
      type: "MOVE_CARD",
      cardId: "card-4",
      sourceColumnId: "col-todo",
      destinationColumnId: "col-todo",
      destinationIndex: 0,
    });
    const column = result.columns.find((c) => c.id === "col-todo");
    expect(column?.cardIds).toEqual(["card-4", "card-3"]);
  });

  it("moves a card to a different column", () => {
    const result = boardReducer(initialBoardState, {
      type: "MOVE_CARD",
      cardId: "card-3",
      sourceColumnId: "col-todo",
      destinationColumnId: "col-in-progress",
      destinationIndex: 1,
    });
    const sourceCol = result.columns.find((c) => c.id === "col-todo");
    const destCol = result.columns.find((c) => c.id === "col-in-progress");
    expect(sourceCol?.cardIds).not.toContain("card-3");
    expect(destCol?.cardIds).toEqual(["card-5", "card-3", "card-6"]);
    expect(result.cards["card-3"]).toBeDefined();
  });
});
