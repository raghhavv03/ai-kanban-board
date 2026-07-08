import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useBoard } from "./useBoard";
import type { BoardState } from "@/types/board";

const boardV1: BoardState = {
  columns: [
    { id: "1", title: "Backlog", cardIds: ["10"] },
    { id: "2", title: "To Do", cardIds: [] },
  ],
  cards: { "10": { id: "10", title: "First", details: "" } },
};

const boardV2: BoardState = {
  columns: [
    { id: "1", title: "Backlog", cardIds: ["10", "11"] },
    { id: "2", title: "To Do", cardIds: [] },
  ],
  cards: {
    "10": { id: "10", title: "First", details: "" },
    "11": { id: "11", title: "Second", details: "d" },
  },
};

function mockJson(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(data) } as Response);
}

describe("useBoard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the board on mount", async () => {
    vi.spyOn(global, "fetch").mockReturnValue(mockJson(boardV1));

    const { result } = renderHook(() => useBoard(true));
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.state.columns).toHaveLength(2);
    expect(result.current.state.cards["10"].title).toBe("First");
  });

  it("adds a card optimistically then reconciles with the server board", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockReturnValueOnce(mockJson(boardV1)) // initial load
      .mockReturnValueOnce(mockJson(boardV2)); // addCardApi response

    const { result } = renderHook(() => useBoard(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.addCard("1", "Second", "d");
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/columns/1/cards",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.state.cards["11"].title).toBe("Second");
  });

  it("sets error status when the initial load fails", async () => {
    vi.spyOn(global, "fetch").mockReturnValue(mockJson(null, false));

    const { result } = renderHook(() => useBoard(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("refetches to reconcile when a mutation fails", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockReturnValueOnce(mockJson(boardV1)) // initial load
      .mockReturnValueOnce(mockJson(null, false)) // rename fails
      .mockReturnValueOnce(mockJson(boardV1)); // refetch

    const { result } = renderHook(() => useBoard(true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.renameColumn("1", "Renamed");
    });

    // last call is the reconciling refetch of /api/board
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/board",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.current.state.columns[0].title).toBe("Backlog");
  });
});
