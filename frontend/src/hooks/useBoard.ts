"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { boardReducer } from "@/lib/boardReducer";
import type { BoardAction, BoardState } from "@/types/board";
import {
  addCardApi,
  deleteCardApi,
  editCardApi,
  fetchBoard,
  moveCardApi,
  renameColumnApi,
} from "@/lib/api";

type Status = "loading" | "ready" | "error";

const EMPTY_BOARD: BoardState = { columns: [], cards: {} };

export function useBoard(enabled: boolean) {
  const [state, dispatch] = useReducer(boardReducer, EMPTY_BOARD);
  const [status, setStatus] = useState<Status>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const board = await fetchBoard();
      dispatch({ type: "SET_BOARD", board });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const board = await fetchBoard();
      dispatch({ type: "SET_BOARD", board });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Apply an optimistic local change, call the API, then reconcile with the
  // authoritative board returned by the server. On failure, refetch.
  const reconcile = useCallback(
    async (optimistic: BoardAction, apiCall: () => Promise<BoardState>) => {
      dispatch(optimistic);
      try {
        const board = await apiCall();
        dispatch({ type: "SET_BOARD", board });
      } catch {
        try {
          const board = await fetchBoard();
          dispatch({ type: "SET_BOARD", board });
        } catch {
          setStatus("error");
        }
      }
    },
    []
  );

  const renameColumn = useCallback(
    (columnId: string, title: string) =>
      reconcile(
        { type: "RENAME_COLUMN", columnId, title },
        () => renameColumnApi(columnId, title)
      ),
    [reconcile]
  );

  const addCard = useCallback(
    (columnId: string, title: string, details: string) =>
      reconcile(
        { type: "ADD_CARD", columnId, card: { title, details } },
        () => addCardApi(columnId, title, details)
      ),
    [reconcile]
  );

  const editCard = useCallback(
    (cardId: string, title: string, details: string) =>
      reconcile(
        { type: "EDIT_CARD", cardId, card: { title, details } },
        () => editCardApi(cardId, title, details)
      ),
    [reconcile]
  );

  const deleteCard = useCallback(
    (columnId: string, cardId: string) =>
      reconcile(
        { type: "DELETE_CARD", columnId, cardId },
        () => deleteCardApi(cardId)
      ),
    [reconcile]
  );

  // Live drag reordering: local-only, no network (fires many times per drag).
  const moveCardLocal = useCallback((action: BoardAction) => {
    dispatch(action);
  }, []);

  // Persist the final card position once, on drop.
  const persistMove = useCallback(
    async (
      cardId: string,
      destinationColumnId: string,
      destinationIndex: number
    ) => {
      try {
        const board = await moveCardApi(
          cardId,
          destinationColumnId,
          destinationIndex
        );
        dispatch({ type: "SET_BOARD", board });
      } catch {
        try {
          const board = await fetchBoard();
          dispatch({ type: "SET_BOARD", board });
        } catch {
          setStatus("error");
        }
      }
    },
    []
  );

  return {
    state,
    status,
    reload: load,
    refresh,
    renameColumn,
    addCard,
    editCard,
    deleteCard,
    moveCardLocal,
    persistMove,
  };
}
