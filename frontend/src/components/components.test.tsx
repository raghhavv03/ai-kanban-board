import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableColumnTitle } from "./EditableColumnTitle";
import { AddCardForm } from "./AddCardForm";
import { Board } from "./Board";
import { LoginForm } from "./LoginForm";
import { initialBoardState } from "@/lib/boardReducer";

describe("EditableColumnTitle", () => {
  it("renders title and allows renaming", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(<EditableColumnTitle title="To Do" onRename={onRename} />);

    expect(screen.getByText("To Do")).toBeInTheDocument();

    await user.click(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column title");
    await user.clear(input);
    await user.type(input, "Ready{Enter}");

    expect(onRename).toHaveBeenCalledWith("Ready");
  });
});

describe("AddCardForm", () => {
  it("opens form and submits a card", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddCardForm onAdd={onAdd} />);

    await user.click(screen.getByTestId("add-card-button"));
    await user.type(screen.getByLabelText("Card title"), "New task");
    await user.type(screen.getByLabelText("Card details"), "Details here");
    await user.click(screen.getByTestId("add-card-submit"));

    expect(onAdd).toHaveBeenCalledWith("New task", "Details here");
  });
});

describe("LoginForm", () => {
  it("submits entered credentials", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByTestId("login-submit"));

    expect(onLogin).toHaveBeenCalledWith("user", "password");
  });

  it("shows an error when login is rejected", async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByTestId("login-submit"));

    expect(await screen.findByTestId("login-error")).toBeInTheDocument();
  });
});

function renderBoard(overrides = {}) {
  const props = {
    state: initialBoardState,
    onMoveLocal: vi.fn(),
    onPersistMove: vi.fn(),
    onRenameColumn: vi.fn(),
    onAddCard: vi.fn(),
    onEditCard: vi.fn(),
    onDeleteCard: vi.fn(),
    ...overrides,
  };
  render(<Board {...props} />);
  return props;
}

describe("Board", () => {
  it("renders all columns with dummy data", () => {
    renderBoard();

    expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Research competitors")).toBeInTheDocument();
  });

  it("edits a card and calls onEditCard", async () => {
    const onEditCard = vi.fn();
    const user = userEvent.setup();
    renderBoard({ onEditCard });

    await user.click(screen.getByLabelText("Edit card: Research competitors"));

    const titleInput = screen.getByLabelText("Edit card title");
    await user.clear(titleInput);
    await user.type(titleInput, "Analyze competitors");
    await user.click(screen.getByTestId("card-edit-save-card-1"));

    expect(onEditCard).toHaveBeenCalledWith(
      "card-1",
      "Analyze competitors",
      expect.any(String)
    );
  });

  it("adds a card and calls onAddCard", async () => {
    const onAddCard = vi.fn();
    const user = userEvent.setup();
    renderBoard({ onAddCard });

    const backlog = screen.getByTestId("column-col-backlog");
    await user.click(within(backlog).getByTestId("add-card-button"));
    await user.type(within(backlog).getByLabelText("Card title"), "Fresh task");
    await user.click(within(backlog).getByTestId("add-card-submit"));

    expect(onAddCard).toHaveBeenCalledWith(
      "col-backlog",
      "Fresh task",
      expect.any(String)
    );
  });
});
