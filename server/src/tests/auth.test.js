import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../server.js";

describe("Auth Routes", () => {
  it("should reject unauthorized verify route", async () => {
    const response = await request(app)
      .post("/api/v1/auth/verify_route");

    expect(response.statusCode).toBe(401);
  });
});