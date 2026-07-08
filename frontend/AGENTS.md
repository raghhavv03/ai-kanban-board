# Frontend

NextJS (App Router) + React + TypeScript + Tailwind CSS v4 Kanban board. Built as a static export (`output: "export"` in `next.config.ts`, emitted to `out/`) and served by the FastAPI backend at `/`. Currently client-only with in-memory state and dummy data; backend persistence is added in Part 7.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`), configured in `src/app/globals.css` with brand colors as CSS variables
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` for drag and drop
- Vitest + Testing Library (jsdom) for unit/component tests
- Playwright for e2e tests
- Fonts: `DM_Sans` (body), `Outfit` (display), via `next/font/google`

## Directory layout

- `src/app/layout.tsx` - root layout, loads fonts, sets metadata, base body styles
- `src/app/page.tsx` - home page. Uses `useAuth`: shows a loading spinner, then `LoginForm` if unauthenticated, otherwise the header (with logout button) + `Board`. `Board` is loaded with `next/dynamic` and `ssr: false` (drag/drop is client-only) with a skeleton loading state
- `src/lib/api.ts` - fetch client for the backend API (auth: `getMe`/`login`/`logout`; board: `fetchBoard` + column/card mutation calls), sends cookies with `credentials: "include"`
- `src/hooks/useAuth.ts` - auth state hook (`loading`/`authed`/`anon`), checks `/api/me` on load, exposes `login`/`logout`
- `src/hooks/useBoard.ts` - board state hook. Takes an `enabled` flag (loads once authenticated), holds status (`loading`/`ready`/`error`), and exposes optimistic actions (rename/add/edit/delete) that reconcile with the server board, plus `moveCardLocal` (live drag) and `persistMove` (persist on drop)
- `src/components/LoginForm.tsx` - sign-in form (username/password) with error state
- `src/app/globals.css` - Tailwind import, brand color CSS variables, `@theme` mapping, reduced-motion handling
- `src/types/board.ts` - core types: `Card`, `Column`, `BoardState`, `BoardAction`
- `src/data/dummyData.ts` - `initialBoardState`: 5 seeded columns (Backlog, To Do, In Progress, Review, Done) and 9 cards
- `src/lib/boardReducer.ts` - pure reducer handling `RENAME_COLUMN`, `ADD_CARD`, `EDIT_CARD`, `DELETE_CARD`, `MOVE_CARD`; generates card ids locally
- `src/lib/dropIndex.ts` - drag/drop helpers: `columnDroppableId`/`columnEndId` (namespace column droppable ids as `col-<id>` so they never collide with numeric card ids), `resolveOverColumn`, `computeDropIndex`
- `src/hooks/useBoard.ts` - `useReducer` wrapper exposing `{ state, dispatch }`
- `src/components/Board.tsx` - `DndContext`, sensors, drag handlers, renders columns + `DragOverlay`. Custom collision detection (`pointerWithin` -> nearest card in the hovered column) plus `MeasuringStrategy.Always` so droppable rects stay accurate as cards shift columns mid-drag. Uses callback props: live drag reordering via `onMoveLocal`, persistence via `onPersistMove` on drop, and `onRenameColumn`/`onAddCard`/`onEditCard`/`onDeleteCard`
- `src/components/Column.tsx` - a column with droppable body and an end-drop zone; renders `EditableColumnTitle`, cards, `AddCardForm`
- `src/components/Card.tsx` - sortable card with title, details, hover-to-reveal edit and delete buttons; inline edit form (drag disabled while editing)
- `src/components/AddCardForm.tsx` - inline add-card form (title + optional details)
- `src/components/EditableColumnTitle.tsx` - click-to-edit column title (Enter saves, Escape cancels, blur saves)

## State model

State is a normalized board held in memory:

```
BoardState = {
  columns: { id, title, cardIds: string[] }[]   // column order + card order per column
  cards: Record<string, { id, title, details }>  // card lookup by id
}
```

The board is loaded from the backend (`GET /api/board`) after login and held via `useBoard`. Local edits are applied optimistically through `boardReducer`, then reconciled with the authoritative board returned by each mutation endpoint. Cards can be added, edited, deleted, and moved. There is no add/remove column (columns are fixed, only renameable).

## Data flow

`page.tsx` -> `useBoard(enabled)` -> `<Board ...callbacks>` -> columns/cards. Board load happens after auth; UI events call the hook's action functions, which optimistically update local state and call the backend, then replace state with the server's board. Drag events are resolved into moves using `dropIndex.ts` helpers (local live reorder, persisted once on drop).

## Styling / brand

Brand colors are defined once in `globals.css` and referenced as Tailwind classes (e.g. `text-dark-navy`, `bg-purple-secondary`, `border-accent-yellow`): accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`, dark navy `#032147`, gray `#888888`.

## Tests

- Unit/component (Vitest): `src/lib/boardReducer.test.ts`, `src/lib/dropIndex.test.ts`, `src/components/components.test.tsx`; setup in `src/test/setup.ts`; config in `vitest.config.ts` (jsdom, `@` alias, excludes `e2e/`)
- e2e (Playwright): `e2e/kanban.spec.ts` covers load, rename column, add card, delete card, cross-column drag, drag to last position; config in `playwright.config.ts` (builds+starts on port 3001)

## Scripts

- `npm run dev` - dev server
- `npm run build` - production build
- `npm run start` - serve production build
- `npm run lint` - eslint
- `npm run test` / `test:watch` - Vitest
- `npm run test:e2e` / `test:e2e:ui` - Playwright

## Build and serving

- `next.config.ts` sets `output: "export"`; `npm run build` emits the static site to `out/`.
- In Docker, the `out/` export is copied into `backend/app/static/` and served by FastAPI at `/`. e2e tests build the export and serve it via the FastAPI backend (`STATIC_DIR=out uv run uvicorn ...`) on port 3001 so the auth API is available.
- The board is seeded from `dummyData.ts` and held in memory; this will be replaced by backend-persisted state in Part 7.
