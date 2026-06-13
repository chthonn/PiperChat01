import { body } from "express-validator";

export const emailValidator = () =>
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address");

export const passwordValidator = () =>
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string");

export const strongPasswordValidator = () =>
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 7, max: 64 })
    .withMessage("Password must be between 7 and 64 characters")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number");

export const usernameValidator = () =>
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and dots",
    );

export const dobValidator = () =>
  body("dob")
    .notEmpty()
    .withMessage("Date of birth is required")
    .custom((value) => {
      const dob = new Date(value);

      if (Number.isNaN(dob.getTime())) {
        throw new Error("Invalid date of birth");
      }

      const today = new Date();

      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age -= 1;
      }

      if (age < 13) {
        throw new Error("User must be at least 13 years old");
      }

      return true;
    });

export const otpValidator = () =>
  body("otp_value")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isNumeric()
    .withMessage("OTP must contain only numbers")
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must contain exactly 4 digits");

export const messageContentValidator = (field = "message") =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content must be between 1 and 2000 characters");

export const serverIdValidator = () =>
  body("server_id").trim().notEmpty().withMessage("Server ID is required");

export const channelIdValidator = () =>
  body("channel_id").trim().notEmpty().withMessage("Channel ID is required");

export const channelNameValidator = () =>
  body("channel_name")
    .trim()
    .notEmpty()
    .withMessage("Channel name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Channel name must be between 1 and 100 characters");

export const timestampValidator = () =>
  body("timestamp")
    .notEmpty()
    .withMessage("Timestamp is required")
    .isNumeric()
    .withMessage("Timestamp must be numeric");

export const tagValidator = () =>
  body("tag")
    .trim()
    .notEmpty()
    .withMessage("Tag is required")
    .isLength({ min: 1, max: 10 })
    .withMessage("Invalid tag");

export const profilePicValidator = () =>
  body("profile_pic")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Profile picture must be a string");

export const friendIdValidator = () =>
  body("friend_id").trim().notEmpty().withMessage("Friend ID is required");
