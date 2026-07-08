import { describe, it, expect } from "vitest";
import {
  columnDroppableId,
  columnEndId,
  computeDropIndex,
  resolveOverColumn,
} from "./dropIndex";
import type { Column } from "@/types/board";

const column: Column = {
  id: "2",
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

function makeEventWithPointer(
  overId: string,
  overRect: { top: number; height: number },
  pointerStartY: number,
  deltaY: number,
  activeTop: number,
  activeHeight = 60
) {
  return {
    activatorEvent: new MouseEvent("mousedown", { clientY: pointerStartY }),
    delta: { x: 0, y: deltaY },
    active: {
      id: "card-x",
      rect: { current: { translated: { top: activeTop, height: activeHeight } } },
    },
    over: { id: overId, rect: overRect },
  } as Parameters<typeof computeDropIndex>[0];
}

describe("dropIndex", () => {
  it("resolves column from its namespaced droppable id", () => {
    const columns = [column];
    expect(resolveOverColumn(columns, columnDroppableId("2"))).toEqual(column);
  });

  it("resolves column from end droppable id", () => {
    const columns = [column];
    expect(resolveOverColumn(columns, columnEndId("2"))).toEqual(column);
  });

  it("resolves a card id to its column even when it equals a column id", () => {
    // Card id "2" collides numerically with the column id "2"; the card must
    // still resolve to the column that contains it, not the column named "2".
    const review: Column = { id: "4", title: "Review", cardIds: ["2"] };
    const columns = [column, review];
    expect(resolveOverColumn(columns, "2")).toEqual(review);
  });

  it("inserts at end when dropping on column container", () => {
    const dropId = columnDroppableId("2");
    const index = computeDropIndex(
      makeEvent(dropId, { top: 0, height: 200 }, 180),
      column,
      dropId,
      "card-x"
    );
    expect(index).toBe(3);
  });

  it("inserts at end when dropping on end zone", () => {
    const index = computeDropIndex(
      makeEvent(columnEndId("2"), { top: 200, height: 40 }, 220),
      column,
      columnEndId("2"),
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

  it("uses the pointer position, not the dragged card's center", () => {
    // Target card-b midpoint is 110. The tall dragged card's own center is
    // 50 + 200/2 = 150 (below the midpoint, which would wrongly force "below"),
    // but the pointer is at 300 - 195 = 105 (upper half). The drop must land
    // ABOVE the card.
    const index = computeDropIndex(
      makeEventWithPointer("card-b", { top: 80, height: 60 }, 300, -195, 50, 200),
      column,
      "card-b",
      "card-x"
    );
    expect(index).toBe(1);
  });

  it("reads pointer position from PointerEvent activators", () => {
    const index = computeDropIndex(
      {
        activatorEvent: new PointerEvent("pointerdown", { clientY: 300 }),
        delta: { x: 0, y: -195 },
        active: {
          id: "card-x",
          rect: { current: { translated: { top: 50, height: 200 } } },
        },
        over: { id: "card-b", rect: { top: 80, height: 60 } },
      } as Parameters<typeof computeDropIndex>[0],
      column,
      "card-b",
      "card-x"
    );
    expect(index).toBe(1);
  });

  it("inserts after a card when the pointer is in the lower half", () => {
    // Same geometry, pointer at 300 - 170 = 130 (lower half) -> below.
    const index = computeDropIndex(
      makeEventWithPointer("card-b", { top: 80, height: 60 }, 300, -170, 50, 200),
      column,
      "card-b",
      "card-x"
    );
    expect(index).toBe(2);
  });
});
