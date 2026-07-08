import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "./ChatSidebar";

describe("ChatSidebar", () => {
  it("starts collapsed and opens on click", async () => {
    const user = userEvent.setup();
    render(
      <ChatSidebar messages={[]} loading={false} error={null} onSend={vi.fn()} />
    );

    expect(screen.getByTestId("chat-open")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-sidebar")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("chat-open"));
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
  });

  it("renders messages and sends input when open", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatSidebar
        messages={[
          { role: "user", content: "Add a card" },
          { role: "assistant", content: "Added it." },
        ]}
        loading={false}
        error={null}
        onSend={onSend}
      />
    );

    await user.click(screen.getByTestId("chat-open"));

    expect(screen.getByText("Add a card")).toBeInTheDocument();
    expect(screen.getByText("Added it.")).toBeInTheDocument();

    await user.type(screen.getByTestId("chat-input"), "Move card 1");
    await user.click(screen.getByTestId("chat-send"));

    expect(onSend).toHaveBeenCalledWith("Move card 1");
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ChatSidebar messages={[]} loading={false} error={null} onSend={vi.fn()} />
    );

    await user.click(screen.getByTestId("chat-open"));
    await user.click(screen.getByTestId("chat-close"));

    expect(screen.getByTestId("chat-open")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-sidebar")).not.toBeInTheDocument();
  });

  it("shows loading state", async () => {
    const user = userEvent.setup();
    render(
      <ChatSidebar
        messages={[]}
        loading={true}
        error={null}
        onSend={vi.fn()}
      />
    );

    await user.click(screen.getByTestId("chat-open"));

    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();
    expect(screen.getByTestId("chat-send")).toBeDisabled();
  });
});
