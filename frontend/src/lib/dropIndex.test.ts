import { describe, it, expect } from "vitest";
import {
  columnEndId,
  computeDropIndex,
  resolveOverColumn,
} from "./dropIndex";
import type { Column } from "@/types/board";

const column: Column = {
  id: "col-todo",
  title: "To Do",
  cardIds: ["card-a", "card-b", "card-c"],
};

function makeEvent(
  overId: string,
  overRect: { top: number; height: number },
  activeTop: number,
  activeHeight = 60
) {
  return {
    active: {
      id: "card-x",
      rect: {
        current: {
          translated: {
            top: activeTop,
            height: activeHeight,
          },
        },
      },
    },
    over: {
      id: overId,
      rect: overRect,
    },
  } as Parameters<typeof computeDropIndex>[0];
}

describe("dropIndex", () => {
  it("resolves column from end droppable id", () => {
    const columns = [column];
    expect(resolveOverColumn(columns, columnEndId("col-todo"))).toEqual(column);
  });

  it("inserts at end when dropping on column container", () => {
    const index = computeDropIndex(
      makeEvent("col-todo", { top: 0, height: 200 }, 180),
      column,
      "col-todo",
      "card-x"
    );
    expect(index).toBe(3);
  });

  it("inserts at end when dropping on end zone", () => {
    const index = computeDropIndex(
      makeEvent(columnEndId("col-todo"), { top: 200, height: 40 }, 220),
      column,
      columnEndId("col-todo"),
      "card-x"
    );
    expect(index).toBe(3);
  });

  it("inserts before a card when pointer is in the upper half", () => {
    const index = computeDropIndex(
      makeEvent("card-b", { top: 80, height: 60 }, 75),
      column,
      "card-b",
      "card-x"
    );
    expect(index).toBe(1);
  });

  it("inserts after a card when pointer is in the lower half", () => {
    const index = computeDropIndex(
      makeEvent("card-c", { top: 140, height: 60 }, 175),
      column,
      "card-c",
      "card-x"
    );
    expect(index).toBe(3);
  });
});
