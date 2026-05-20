import { vi } from "vitest";

vi.mock("../services/email.js", () => {
  return {
    generateOTP: vi.fn(() => "123456"),

    sendMail: vi.fn(async () => ({
      ok: true,
    })),

    verifyMailTransport: vi.fn(async () => true),
  };
});