import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import BottomNavigation from "../../components/BottomNavigation";
import type { ReactNode } from "react";

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/home"],
}));

describe("BottomNavigation", () => {
  it("should render all navigation items", () => {
    const { container } = render(<BottomNavigation />);

    expect(container.textContent).toContain("Map");
    expect(container.textContent).toContain("Family");
    expect(container.textContent).toContain("Places");
    expect(container.textContent).toContain("History");
    expect(container.textContent).toContain("Settings");
  });

  it("should render correct number of navigation items", () => {
    const { container } = render(<BottomNavigation />);
    const navItems = container.querySelectorAll("a");
    expect(navItems.length).toBe(5);
  });

  it("should have proper structure", () => {
    const { container } = render(<BottomNavigation />);
    const bottomNav = container.querySelector(".fixed.bottom-0");
    expect(bottomNav).toBeTruthy();
  });
});
