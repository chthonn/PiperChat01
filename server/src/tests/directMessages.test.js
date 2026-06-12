import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../server.js";

describe("Direct Message Routes", () => {
  it("should reject unauthorized message sending", async () => {
    const response = await request(app)
      .post("/api/v1/direct-messages/send_direct_message")
      .send({
        friend_id: "123456",
        content: "Hello",
      });

    expect(response.statusCode).toBe(401);
  });

  it("should reject unauthorized message fetching", async () => {
    const response = await request(app)
      .post("/api/v1/direct-messages/get_direct_messages")
      .send({
        friend_id: "123456",
      });

    expect(response.statusCode).toBe(401);
  });
});