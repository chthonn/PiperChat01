import User from "../models/User.js";
import { sendMail } from "./email.js";
import { storeOtp } from "./otpService.js";

export async function isUsernameAvailable(username) {
  const latestTaggedUser = await User.findOne({
    tag: { $regex: "^[0-9]{4}$" },
  })
    .sort({ tag: -1 })
    .select("tag")
    .lean();

  const nextTagNumber = latestTaggedUser
    ? parseInt(latestTaggedUser.tag, 10) + 1
    : 1;

  return { final_tag: generateTag(nextTagNumber), tag_counter: nextTagNumber };
}

export function signup(email, username, password, dob) {
  return (async () => {
    const data = await User.find({ email }).lean();

    if (data.length === 0) {
      if (!username || !email || !password || !dob) {
        return { message: "wrong input", status: 204 };
      }
      if (password.length < 8) {
        return { message: "password length", status: 400 };
      }
      return { message: true };
    }

    if (data[0].authorized === true) {
      return { message: "user already exists", status: 202 };
    }

    if (data[0].username === username) {
      return {
        message: "existing_unverified_same_username",
        tag: data[0].tag,
      };
    }

    return { message: "existing_unverified_different_username" };
  })();
}

export async function updatingCreds(accountCreds, otp, email, username) {
  await User.updateOne({ email }, accountCreds);

  const otpStored = await storeOtp(email, otp);
  if (!otpStored) {
    return {
      message: "otp_storage_failed",
      status: 500,
      mailResult: { ok: false },
    };
  }

  const mailResult = await sendMail(otp, email, username);
  return { message: "updated", status: 201, mailResult };
}

export function generateTag(countValue) {
  return countValue.toString().padStart(4, "0");
}
