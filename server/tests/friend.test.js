import "./mocks.js";

import request from "supertest";
import { describe, expect, test } from "vitest";

import User from "../models/User.js";
import app from "../app.js";

async function createAndLoginUser(userData) {
  await request(app).post("/signup").send(userData);

  await request(app).post("/verify").send({
    email: userData.email,
    otp_value: "123456",
  });

  const signinRes = await request(app).post("/signin").send({
    email: userData.email,
    password: userData.password,
  });

  return signinRes.body.token;
}

describe("Friend Request Flow", () => {
  test("User should send friend request", async () => {
    const tokenA = await createAndLoginUser({
      email: "a@test.com",
      username: "userA",
      password: "1234567",
      dob: "2005-01-01",
    });

    await createAndLoginUser({
      email: "b@test.com",
      username: "userB",
      password: "1234567",
      dob: "2005-01-01",
    });

    const userB = await User.findOne({
      email: "b@test.com",
    });

    const friendTag = `${userB.username}#${userB.tag}`;

    const res = await request(app)
      .post("/add_friend")
      .set("x-auth-token", tokenA)
      .send({
        friend: friendTag,
      });

    expect(res.statusCode).toBe(203);

    expect(res.body.message).toBe("Request sent successfully");
  });

  test("User should ignore friend request", async () => {
    const tokenA = await createAndLoginUser({
      email: "a@test.com",
      username: "userA",
      password: "1234567",
      dob: "2005-01-01",
    });

    const tokenB = await createAndLoginUser({
      email: "b@test.com",
      username: "userB",
      password: "1234567",
      dob: "2005-01-01",
    });

    const userA = await User.findOne({
      email: "a@test.com",
    });

    const userB = await User.findOne({
      email: "b@test.com",
    });

    await request(app)
      .post("/add_friend")
      .set("x-auth-token", tokenA)
      .send({
        friend: `${userB.username}#${userB.tag}`,
      });

    const res = await request(app)
      .post("/process_req")
      .set("x-auth-token", tokenB)
      .send({
        message: "Ignore",
        friend_data: {
          id: String(userA._id),
        },
      });

    expect(res.statusCode).toBe(200);

    const updatedA = await User.findById(userA._id);

    const updatedB = await User.findById(userB._id);

    expect(updatedA.friends.length).toBe(0);

    expect(updatedB.friends.length).toBe(0);
  });
});
