import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChat } from "./useChat";

function mockJson(data: unknown, ok = true, status = ok ? 200 : 502) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe("useChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a message and appends the assistant reply", async () => {
    const onBoardChanged = vi.fn();
    vi.spyOn(global, "fetch").mockReturnValue(
      mockJson({ reply: "Done.", board_changed: false })
    );

    const { result } = renderHook(() => useChat(onBoardChanged));

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    expect(result.current.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "Done." },
    ]);
    expect(onBoardChanged).not.toHaveBeenCalled();
  });

  it("refreshes the board when the assistant changed it", async () => {
    const onBoardChanged = vi.fn();
    vi.spyOn(global, "fetch").mockReturnValue(
      mockJson({ reply: "Added.", board_changed: true })
    );

    const { result } = renderHook(() => useChat(onBoardChanged));

    await act(async () => {
      await result.current.sendMessage("add a card");
    });

    expect(onBoardChanged).toHaveBeenCalledOnce();
  });

  it("shows an error when the chat request fails", async () => {
    const onBoardChanged = vi.fn();
    vi.spyOn(global, "fetch").mockReturnValue(mockJson({}, false));

    const { result } = renderHook(() => useChat(onBoardChanged));

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("Request failed (502)")
    );
  });
});
