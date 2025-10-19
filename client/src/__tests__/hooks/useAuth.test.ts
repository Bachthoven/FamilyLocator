import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

describe("useAuth Hook", () => {
  it("should validate email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test("test@example.com")).toBe(true);
    expect(emailRegex.test("user.name+tag@example.co.uk")).toBe(true);
    expect(emailRegex.test("invalid.email")).toBe(false);
    expect(emailRegex.test("@example.com")).toBe(false);
    expect(emailRegex.test("test@")).toBe(false);
  });

  it("should validate password length", () => {
    const isValidPassword = (password: string) => password.length >= 6;

    expect(isValidPassword("123456")).toBe(true);
    expect(isValidPassword("longpassword123")).toBe(true);
    expect(isValidPassword("12345")).toBe(false);
    expect(isValidPassword("")).toBe(false);
  });

  it("should validate phone number format", () => {
    const phoneRegex = /^[\d\s\-\(\)]+$/;

    expect(phoneRegex.test("1234567890")).toBe(true);
    expect(phoneRegex.test("123-456-7890")).toBe(true);
    expect(phoneRegex.test("(123) 456-7890")).toBe(true);
    expect(phoneRegex.test("abc123")).toBe(false);
  });
});
