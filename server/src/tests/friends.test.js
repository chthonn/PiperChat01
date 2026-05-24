import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../server.js";

describe("Friend Routes", () => {
  it("should reject unauthorized friend request", async () => {
    const response = await request(app)
      .post("/api/v1/friends/add_friend")
      .send({
        friend: "deval#1234",
      });

    expect(response.statusCode).toBe(401);
  });

  it("should reject unauthorized friend processing", async () => {
    const response = await request(app)
      .post("/api/v1/friends/process_req")
      .send({
        message: "Accept",
        friend_data: {
          id: "123456",
        },
      });

    expect(response.statusCode).toBe(401);
  });
});