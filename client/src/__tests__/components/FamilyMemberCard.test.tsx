import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import FamilyMemberCard from "../../components/FamilyMemberCard";
import type { User } from "@shared/schema";
import type { ReactNode } from "react";

vi.mock("wouter", () => ({
  Link: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const mockUser: User = {
  id: 1,
  email: "test@example.com",
  password: "hashed",
  firstName: "Test",
  lastName: "User",
  phoneNumber: "+1234567890",
  profileImageUrl: null,
  locationSharingEnabled: true,
  locationHistoryEnabled: true,
  notificationsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("FamilyMemberCard", () => {
  it("should render user name", () => {
    const { container } = render(<FamilyMemberCard user={mockUser} />);

    expect(container.textContent).toContain("Test User");
  });

  it("should display online status when recently active", () => {
    const timestamp = new Date().toISOString();
    const { container } = render(
      <FamilyMemberCard user={mockUser} lastSeen={timestamp} />
    );

    expect(container.textContent).toContain("Test User");
  });

  it("should handle user without phone number", () => {
    const userWithoutPhone = { ...mockUser, phoneNumber: null };
    const { container } = render(<FamilyMemberCard user={userWithoutPhone} />);

    expect(container.textContent).toContain("Test User");
  });

  it("should handle user without profile image", () => {
    const { container } = render(<FamilyMemberCard user={mockUser} />);

    expect(container.textContent).toContain("Test User");
  });
});
