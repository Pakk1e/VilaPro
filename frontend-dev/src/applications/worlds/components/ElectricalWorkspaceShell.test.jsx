import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ElectricalWorkspaceShell from "./ElectricalWorkspaceShell";

describe("ElectricalWorkspaceShell", () => {
  it("renders the four workspace surfaces and supports focus mode", async () => {
    render(
      <ElectricalWorkspaceShell>
        <div data-testid="test-canvas">canvas</div>
      </ElectricalWorkspaceShell>
    );

    expect(screen.getByTestId("workspace-library-surface")).toBeTruthy();
    expect(screen.getByTestId("workspace-canvas-surface")).toBeTruthy();
    expect(screen.getByTestId("workspace-inspector-surface")).toBeTruthy();
    expect(screen.getByTestId("workspace-instrument-surface")).toBeTruthy();

    screen.getByRole("button", { name: "Focus" }).click();

    expect(screen.queryByTestId("workspace-library-surface")).toBeNull();
    expect(screen.queryByTestId("workspace-inspector-surface")).toBeNull();
    expect(screen.queryByTestId("workspace-instrument-surface")).toBeNull();
    expect(screen.getByTestId("workspace-canvas-surface")).toBeTruthy();
  });
});
