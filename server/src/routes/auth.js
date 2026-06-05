import config from "../config/index.js";

import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { buildAuthUserJwtPayload } from "../lib/authJwtPayload.js";
import logger from "../lib/winston.js";
import { authToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { generateOTP, sendMail } from "../services/email.js";
import {
  isUsernameAvailable,
  signup,
  updatingCreds,
} from "../services/userService.js";

import expressRateLimit from "../middleware/rateLimit.js";

const router = express.Router();

function looksLikeBcryptHash(storedPassword) {
  return (
    typeof storedPassword === "string" &&
    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedPassword)
  );
}

function constantTimeStringEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function verifyStoredPassword(plainPassword, storedPassword) {
  if (looksLikeBcryptHash(storedPassword)) {
    try {
      return await bcrypt.compare(plainPassword, storedPassword);
    } catch {
      return false;
    }
  }
  return constantTimeStringEqual(plainPassword, storedPassword);
}

function generateAvatar(username) {
  try {
    const seed = `${username || "user"}-${Date.now()}`;

    return `${config.DICEBEAR_API}/${config.DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
  } catch (error) {
    logger.error(`Avatar generation error: ${error.message}`);

    return config.DEFAULT_PROFILE_PIC;
  }
}

router.post("/verify_route", authToken, (req, res) => {
  res.status(201).json({ message: "authorized", status: 201 });
});

router.post("/signup", expressRateLimit("auth"), async (req, res) => {
  const { email, username, password, dob } = req.body;
  const authorized = false;

  const response = await signup(email, username, password, dob);

  if (
    response.status === 204 ||
    response.status === 400 ||
    response.status === 202
  ) {
    return res
      .status(response.status)
      .json({ message: response.message, status: response.status });
  }

  if (typeof password !== "string" || password.length === 0) {
    return res.status(204).json({ message: "wrong input", status: 204 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (response.message === true) {
    const otp = generateOTP();
    const usernameResponse = await isUsernameAvailable(username);
    const finalTag = usernameResponse.final_tag;

    const newUser = new User({
      username,
      tag: finalTag,
      profile_pic: generateAvatar(username),
      email,
      password: hashedPassword,
      dob,
      authorized,
      verification: [{ timestamp: Date.now(), code: otp }],
    });

    const mailResult = await sendMail(otp, email, username);
    try {
      await newUser.save();
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", status: 500, email_sent: false });
    }
    return res.status(201).json({
      message: "data saved",
      status: 201,
      email_sent: mailResult.ok,
    });
  }

  if (response.message === "not_TLE" || response.message === "TLE_2") {
    const usernameResponse = await isUsernameAvailable(username);
    const tag = usernameResponse.final_tag;
    const accountCreds = {
      $set: {
        username,
        tag,
        email,
        password: hashedPassword,
        dob,
        authorized,
      },
    };
    let otp = response.message === "not_TLE" ? response.otp : generateOTP();
    const newResponse = await updatingCreds(accountCreds, otp, email, username);
    return res.status(newResponse.status).json({
      message: newResponse.message,
      status: newResponse.status,
      email_sent: Boolean(newResponse.mailResult?.ok),
    });
  }

  if (response.message === "not_TLE_2" || response.message === "TLE") {
    const tag = response.tag;
    let accountCreds;
    let otp;

    if (response.message === "not_TLE_2") {
      accountCreds = {
        $set: {
          username,
          tag,
          email,
          password: hashedPassword,
          dob,
          authorized,
        },
      };
      otp = response.otp;
    } else {
      otp = generateOTP();
      accountCreds = {
        $set: {
          username,
          email,
          tag,
          password: hashedPassword,
          dob,
          authorized,
          verification: [{ timestamp: Date.now(), code: otp }],
        },
      };
    }

    const newResponse = await updatingCreds(accountCreds, otp, email, username);
    return res.status(newResponse.status).json({
      message: newResponse.message,
      status: newResponse.status,
      email_sent: Boolean(newResponse.mailResult?.ok),
    });
  }
});

router.post("/verify", expressRateLimit("otp"), async (req, res) => {
  const { email } = req.body;
  const otpValue = String(req.body.otp_value || "").trim();

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found", status: 404 });
    }

    const currentTimestamp = user.verification?.[0]?.timestamp ?? 0;
    const username = user.username;
    const currentOtp = user.verification?.[0]?.code;

    if (Date.now() - currentTimestamp < config.OTP_TTL_MS) {
      if (otpValue === currentOtp) {
        await User.updateOne({ email }, { $set: { authorized: true } });
        return res.status(201).json({
          message: "Congrats you are verified now",
          status: 201,
        });
      }
      return res.status(432).json({ error: "incorrect passowrd", status: 432 });
    }

    const otp = generateOTP();
    await User.updateOne(
      { email },
      {
        $set: {
          verification: [{ timestamp: Date.now(), code: otp }],
        },
      },
    );
    await sendMail(otp, email, username);
    return res.status(442).json({ error: "otp changed", status: 442 });
  } catch (err) {
    return res.status(500).json({ error: "Server error", status: 500 });
  }
});

router.post("/resend_otp", expressRateLimit("otp"), async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found", status: 404 });
    }
    if (user.authorized === true) {
      return res.status(409).json({ error: "Already verified", status: 409 });
    }

    const username = user.username;
    const otp = generateOTP();
    await User.updateOne(
      { email },
      { $set: { verification: [{ timestamp: Date.now(), code: otp }] } },
    );
    const mailResult = await sendMail(otp, email, username);
    return res.status(201).json({
      message: "otp resent",
      status: 201,
      email_sent: mailResult.ok,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", status: 500 });
  }
});

router.post("/signin", expressRateLimit("auth"), async (req, res) => {
  try {
    const email = req.body.email;
    const plainPassword = req.body.password;
    if (
      typeof email !== "string" ||
      email.length === 0 ||
      typeof plainPassword !== "string" ||
      plainPassword.length === 0
    ) {
      return res
        .status(442)
        .json({ error: "invalid username or password", status: 442 });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res
        .status(442)
        .json({ error: "invalid username or password", status: 442 });
    }

    const validPassword = await verifyStoredPassword(
      plainPassword,
      user.password,
    );

    if (!validPassword) {
      return res
        .status(442)
        .json({ error: "invalid username or password", status: 442 });
    }

    if (user.authorized !== true) {
      return res
        .status(422)
        .json({ error: "you are not verified yet", status: 422 });
    }

    if (!looksLikeBcryptHash(user.password)) {
      const newHash = await bcrypt.hash(plainPassword, 10);
      await User.updateOne({ _id: user._id }, { $set: { password: newHash } });
    }

    const token = jwt.sign(
      buildAuthUserJwtPayload(user),
      config.ACCESS_TOKEN,
      { expiresIn: "7d" }
    );
    return res
      .status(201)
      .json({ message: "you are verified", status: 201, token });
  } catch (err) {
    return res.status(500).json({ error: "Server error", status: 500 });
  }
});

export default router;
