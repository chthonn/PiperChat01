import User from "../models/User.js";
import { OTP_TTL_MS } from "../config/constants.js";
import { sendMail } from "./email.js";

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
      if (password.length < 7) {
        return { message: "password length", status: 400 };
      }
      return { message: true };
    }

    if (data[0].authorized === true) {
      return { message: "user already exists", status: 202 };
    }

    const currentTimestamp = data[0].verification?.[0]?.timestamp ?? 0;
    const currentOtp = data[0].verification?.[0]?.code;

    if (data[0].username !== username && Date.now() - currentTimestamp < OTP_TTL_MS) {
      return { message: "not_TLE", otp: currentOtp };
    }
    if (data[0].username === username && Date.now() - currentTimestamp < OTP_TTL_MS) {
      return { message: "not_TLE_2", otp: currentOtp, tag: data[0].tag };
    }
    if (data[0].username === username && Date.now() - currentTimestamp > OTP_TTL_MS) {
      return { message: "TLE", tag: data[0].tag };
    }
    return { message: "TLE_2" };
  })();
}

export async function updatingCreds(accountCreds, otp, email, username) {
  await User.updateOne({ email }, accountCreds);
  const mailResult = await sendMail(otp, email, username);
  return { message: "updated", status: 201, mailResult };
}

export function generateTag(countValue) {
  return countValue.toString().padStart(4, "0");
}
