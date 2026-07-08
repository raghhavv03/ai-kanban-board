# Frontend

NextJS (App Router) + React + TypeScript + Tailwind CSS v4 Kanban board. Built as a static export (`output: "export"` in `next.config.ts`, emitted to `out/`) and served by the FastAPI backend at `/`. Fully wired to the backend API for auth, persistent board state, and AI chat sidebar (Parts 7-10 complete).

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`), configured in `src/app/globals.css` with brand colors as CSS variables
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` for drag and drop
- Vitest + Testing Library (jsdom) for unit/component tests
- Playwright for e2e tests
- Fonts: `DM_Sans` (body), `Outfit` (display), via `next/font/google`

## Directory layout

- `src/app/layout.tsx` - root layout, loads fonts, sets metadata, base body styles
- `src/app/page.tsx` - home page. Uses `useAuth`, `useBoard`, and `useChat`: loading spinner, then `LoginForm` if unauthenticated, otherwise header (logout) + full-width board (loading/error/ready states) + floating `ChatSidebar`. `Board` is loaded with `next/dynamic` and `ssr: false` (drag/drop is client-only) with a skeleton loading state
- `src/lib/api.ts` - typed fetch client for `/api/*` (auth: `getMe`/`login`/`logout`; board: `fetchBoard`, `renameColumnApi`, `addCardApi`, `editCardApi`, `deleteCardApi`, `moveCardApi`; chat: `chatApi`). Sends cookies with `credentials: "include"`
- `src/hooks/useAuth.ts` - auth state hook (`loading`/`authed`/`anon`), checks `/api/me` on load, exposes `login`/`logout`
- `src/hooks/useBoard.ts` - board state hook. Takes `enabled` (true once authenticated). Status: `loading`/`ready`/`error`. Loads board from API, exposes optimistic mutations (rename/add/edit/delete) with server reconciliation, plus `moveCardLocal` (live drag) and `persistMove` (persist on drop). `refresh` silently refetches without loading state (used by AI chat).
- `src/hooks/useChat.ts` - chat hook (Part 10). Sends message + history (max 10) to `/api/chat`; refreshes board when `board_changed` is true; surfaces API error messages in the UI.
- `src/components/LoginForm.tsx` - sign-in form (username/password) with error state
- `src/types/board.ts` - core types: `Card`, `Column`, `BoardState`, `BoardAction` (includes `SET_BOARD`, `EDIT_CARD`, `MOVE_CARD`, etc.)
- `src/data/dummyData.ts` - `initialBoardState` used only in unit tests and as reference for seed data shape; runtime state comes from the API
- `src/lib/boardReducer.ts` - pure reducer: `SET_BOARD`, `RENAME_COLUMN`, `ADD_CARD`, `EDIT_CARD`, `DELETE_CARD`, `MOVE_CARD` (uses `@dnd-kit/sortable` `arrayMove` for same-column moves)
- `src/lib/dropIndex.ts` - drag/drop helpers:
  - `columnDroppableId` / `columnEndId` - namespace column droppables as `col-<id>` so they never collide with numeric card ids from the backend
  - `resolveOverColumn` - map a droppable id (column or card) to its column
  - `computeDropIndex` - pointer-position-aware insert index (uses `getEventCoordinates` + `delta.y` from dnd-kit; falls back to active rect center)
- `src/components/Board.tsx` - `DndContext` with custom collision detection, `onDragMove`/`onDragEnd`, `DragOverlay`, column highlight. Callback props: `onMoveLocal`, `onPersistMove`, `onRenameColumn`, `onAddCard`, `onEditCard`, `onDeleteCard`
- `src/components/Column.tsx` - column UI with namespaced droppable body + end-drop zone; `SortableContext` for cards
- `src/components/Card.tsx` - sortable card; inline edit form (drag disabled while editing)
- `src/components/AddCardForm.tsx` - inline add-card form
- `src/components/EditableColumnTitle.tsx` - click-to-edit column title
- `src/components/ChatSidebar.tsx` - floating circular AI button (bottom-right) that expands into a chat panel on click; closes via X button (Part 10)

## State model

State is a normalized board loaded from the backend:

```
BoardState = {
  columns: { id, title, cardIds: string[] }[]   // column order + card order per column
  cards: Record<string, { id, title, details }>  // card lookup by id
}
```

Board ids are strings in the frontend (backend serializes integer DB ids as strings). Local edits are applied optimistically via `boardReducer`, then reconciled with the full board JSON returned by each mutation endpoint. On failure, the hook refetches the board.

## Data flow

`page.tsx` -> `useAuth` + `useBoard(enabled)` -> `<Board ...callbacks>` -> columns/cards.

- Auth: `useBoard` only loads when `authStatus === "authed"`
- Mutations: optimistic dispatch -> API call -> `SET_BOARD` with server response
- Drag: `onMoveLocal` on every `onDragMove` (live reorder); `onPersistMove` on `onDragEnd` if position changed

## Drag and drop (important details)

Implemented in `Board.tsx` + `dropIndex.ts`. A new session working on the board or AI-driven moves should understand this:

1. **Column/card id collision:** Backend assigns independent integer ids to columns and cards. Column droppables must use `col-<columnId>`, not raw column ids.

2. **Collision detection:** Custom strategy on `DndContext`:
   - Find column under pointer via `pointerWithin` (fallback `rectIntersection`)
   - Within that column, walk cards top-to-bottom; first card whose midpoint is below the pointer is the insertion anchor
   - `MeasuringStrategy.Always` keeps droppable rects accurate as cards shift mid-drag

3. **Insert index:** `computeDropIndex` compares pointer Y to the target card's vertical midpoint (upper half = before, lower half = after). Must use `getEventCoordinates(activatorEvent) + delta.y` because `PointerSensor` fires `PointerEvent`, not `MouseEvent`.

4. **DragOverlay:** The source card stays in the list at opacity 0; the overlay follows the pointer. Do not use the dragged card's rect center for placement logic.

## Styling / brand

Brand colors in `globals.css`, referenced as Tailwind classes: accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`, dark navy `#032147`, gray `#888888`.

## Tests

- **Vitest (39 tests):**
  - `src/lib/boardReducer.test.ts` - reducer actions
  - `src/lib/dropIndex.test.ts` - column resolution, pointer-based before/after index
  - `src/hooks/useBoard.test.ts` - load, optimistic updates, error refetch (mocked fetch)
  - `src/hooks/useChat.test.ts` - send message, board refresh on update, error handling
  - `src/components/components.test.tsx` - LoginForm, Board callbacks
  - `src/components/ChatSidebar.test.tsx` - sidebar render, send, loading
  - Setup: `src/test/setup.ts`; config: `vitest.config.ts`

- **Playwright e2e (15 tests) in `e2e/kanban.spec.ts`:**
  - Auth: login required, invalid credentials, logout, session persistence
  - Board: seeded data, rename/add/edit/delete with reload persistence
  - Drag: cross-column, first position, same-column reorder above, drop above specific card, tall card above shorter card
  - AI chat: mocked chat response with board refresh
  - Config: `playwright.config.ts` builds static export and starts FastAPI with `STATIC_DIR=out`, `ALLOW_TEST_RESET=1` on port 3001
  - `beforeEach` calls `POST /api/test/reset` to reseed the board

## Scripts

- `npm run dev` - dev server
- `npm run build` - static export to `out/`
- `npm run lint` - eslint
- `npm run test` / `test:watch` - Vitest
- `npm run test:e2e` / `test:e2e:ui` - Playwright

## Build and serving

- Docker multi-stage build runs `npm run build`; copies `out/` into `backend/app/static/`
- FastAPI serves static files at `/`; API at `/api/*`
- e2e tests use the same FastAPI-served static export (not `next dev`) so auth, board, and chat APIs are available
