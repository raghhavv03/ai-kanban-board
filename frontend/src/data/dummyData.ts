import type { BoardState } from "@/types/board";

export const initialBoardState: BoardState = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-todo", title: "To Do", cardIds: ["card-3", "card-4"] },
    {
      id: "col-in-progress",
      title: "In Progress",
      cardIds: ["card-5", "card-6"],
    },
    { id: "col-review", title: "Review", cardIds: ["card-7"] },
    { id: "col-done", title: "Done", cardIds: ["card-8", "card-9"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Research competitors",
      details: "Analyze top 5 Kanban tools and note key UX patterns.",
    },
    "card-2": {
      id: "card-2",
      title: "Define user personas",
      details: "Create profiles for project managers and team leads.",
    },
    "card-3": {
      id: "card-3",
      title: "Design board layout",
      details: "Wireframe the column and card structure.",
    },
    "card-4": {
      id: "card-4",
      title: "Set up project repo",
      details: "Initialize Next.js app with TypeScript and Tailwind.",
    },
    "card-5": {
      id: "card-5",
      title: "Build card component",
      details: "Implement draggable cards with title and details.",
    },
    "card-6": {
      id: "card-6",
      title: "Implement drag and drop",
      details: "Wire up @dnd-kit for cross-column card movement.",
    },
    "card-7": {
      id: "card-7",
      title: "Write unit tests",
      details: "Cover reducer actions and component interactions.",
    },
    "card-8": {
      id: "card-8",
      title: "Polish UI styling",
      details: "Apply brand colors and refine spacing.",
    },
    "card-9": {
      id: "card-9",
      title: "Deploy MVP",
      details: "Ship the board and gather initial feedback.",
    },
  },
};
