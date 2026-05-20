import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import supertest from "supertest";
import express from "express";

// ── Mocks must be declared before the real router is imported ──

const mockUserFindOne = jest.fn();
const mockUserUpdateOne = jest.fn();
const mockUserSave = jest.fn();

jest.unstable_mockModule("../src/models/User.js", () => {
  function MockUser(data) { Object.assign(this, data); }
  MockUser.findOne = (q) => ({ lean: () => mockUserFindOne(q) });
  MockUser.updateOne = mockUserUpdateOne;
  MockUser.prototype.save = mockUserSave;
  return { default: MockUser };
});

const mockSignup = jest.fn();
const mockIsUsernameAvailable = jest.fn();
const mockUpdatingCreds = jest.fn();

jest.unstable_mockModule("../src/services/userService.js", () => ({
  signup: mockSignup,
  isUsernameAvailable: mockIsUsernameAvailable,
  updatingCreds: mockUpdatingCreds,
}));

const mockSendMail = jest.fn();

jest.unstable_mockModule("../src/services/email.js", () => ({
  generateOTP: () => "123456",
  sendMail: mockSendMail,
}));

jest.unstable_mockModule("../src/middleware/auth.js", () => ({
  authToken: (_req, _res, next) => next(),
}));

jest.unstable_mockModule("../src/config/index.js", () => ({
  OTP_TTL_MS: 300000,
}));

// ── Build app with the real router after mocks are registered ──

let request;

beforeAll(async () => {
  process.env.ACCESS_TOKEN = "test_secret";
  const { default: authRouter } = await import("../src/routes/auth.js");
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  request = supertest(app);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({ ok: true });
  mockUserUpdateOne.mockResolvedValue({});
  mockUserSave.mockResolvedValue({});
  mockIsUsernameAvailable.mockResolvedValue({ final_tag: "1234" });
});

// ── Tests use the real route handlers, only DB/email are mocked ──

describe("POST /signup", () => {
  it("returns 400 when userService reports missing fields", async () => {
    mockSignup.mockResolvedValue({ status: 400, message: "Missing required fields" });
    const res = await request.post("/signup").send({ email: "a@a.com" });
    expect(res.status).toBe(400);
  });

  it("returns 201 and sends email when signup succeeds", async () => {
    mockSignup.mockResolvedValue({ message: true });
    const res = await request.post("/signup").send({
      email: "new@test.com",
      username: "newuser",
      password: "pass123",
      dob: "2000-01-01",
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("data saved");
  });

  it("returns 204 when email already in use", async () => {
    mockSignup.mockResolvedValue({ status: 204, message: "Email already in use" });
    const res = await request.post("/signup").send({
      email: "exists@test.com",
      username: "u",
      password: "p",
      dob: "2000-01-01",
    });
    expect(res.status).toBe(204);
  });
});

describe("POST /signin", () => {
  it("returns 442 when user is not found", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = await request.post("/signin").send({ email: "no@one.com", password: "x" });
    expect(res.status).toBe(442);
  });

  it("returns 442 when password is wrong", async () => {
    mockUserFindOne.mockResolvedValue({ email: "u@u.com", password: "correct", authorized: true });
    const res = await request.post("/signin").send({ email: "u@u.com", password: "wrong" });
    expect(res.status).toBe(442);
  });

  it("returns 422 when user is not verified", async () => {
    mockUserFindOne.mockResolvedValue({ email: "u@u.com", password: "pass", authorized: false });
    const res = await request.post("/signin").send({ email: "u@u.com", password: "pass" });
    expect(res.status).toBe(422);
  });

  it("returns 201 with token when credentials are correct", async () => {
    mockUserFindOne.mockResolvedValue({
      _id: "abc123",
      email: "u@u.com",
      password: "pass",
      authorized: true,
      username: "user1",
      tag: "0001",
      profile_pic: "",
    });
    const res = await request.post("/signin").send({ email: "u@u.com", password: "pass" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
  });
});

describe("POST /verify", () => {
  it("returns 404 when user is not found", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = await request.post("/verify").send({ email: "no@one.com", otp_value: "111111" });
    expect(res.status).toBe(404);
  });

  it("returns 432 when OTP is wrong but not expired", async () => {
    mockUserFindOne.mockResolvedValue({
      username: "u",
      verification: [{ timestamp: Date.now(), code: "999999" }],
    });
    const res = await request.post("/verify").send({ email: "u@u.com", otp_value: "000000" });
    expect(res.status).toBe(432);
  });

  it("returns 201 when OTP is correct and not expired", async () => {
    mockUserFindOne.mockResolvedValue({
      username: "u",
      verification: [{ timestamp: Date.now(), code: "123456" }],
    });
    const res = await request.post("/verify").send({ email: "u@u.com", otp_value: "123456" });
    expect(res.status).toBe(201);
  });

  it("returns 442 and sends new OTP when OTP is expired", async () => {
    mockUserFindOne.mockResolvedValue({
      username: "u",
      verification: [{ timestamp: Date.now() - 400000, code: "123456" }],
    });
    const res = await request.post("/verify").send({ email: "u@u.com", otp_value: "123456" });
    expect(res.status).toBe(442);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

describe("POST /resend_otp", () => {
  it("returns 404 when user is not found", async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = await request.post("/resend_otp").send({ email: "no@one.com" });
    expect(res.status).toBe(404);
  });

  it("returns 409 when user is already verified", async () => {
    mockUserFindOne.mockResolvedValue({ authorized: true, username: "u" });
    const res = await request.post("/resend_otp").send({ email: "u@u.com" });
    expect(res.status).toBe(409);
  });

  it("returns 201 and sends OTP for unverified user", async () => {
    mockUserFindOne.mockResolvedValue({ authorized: false, username: "u" });
    const res = await request.post("/resend_otp").send({ email: "u@u.com" });
    expect(res.status).toBe(201);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});