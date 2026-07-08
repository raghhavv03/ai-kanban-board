import { useReducer } from "react";
import { boardReducer, initialBoardState } from "@/lib/boardReducer";
import type { BoardAction, BoardState } from "@/types/board";

export function useBoard(): {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
} {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  return { state, dispatch };
}
