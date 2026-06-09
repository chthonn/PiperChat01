import { body } from "express-validator";

export const addFriendValidator = [
  body("friend")
    .trim()
    .notEmpty()
    .withMessage("Friend is required")
    .isString()
    .withMessage("Friend must be a string")
    .custom((value) => {
      if (!value.includes("#")) {
        throw new Error("Friend must include username and tag");
      }

      const [name, tag] = value.split("#");
      if (!tag || !tag.trim()) {
        throw new Error("Friend tag is required");
      }

      return true;
    }),
];

export const processRequestValidator = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Action is required")
    .isIn(["Accept", "Ignore", "Cancel", "Unblock"])
    .withMessage("Unknown action"),

  body("friend_data")
    .notEmpty()
    .withMessage("Friend data is required")
    .isObject()
    .withMessage("Friend data must be an object"),

  body("friend_data.id")
    .trim()
    .notEmpty()
    .withMessage("Friend ID is required"),

  body("friend_data.username")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Friend username must be a string"),

  body("friend_data.tag")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Friend tag must be a string"),

  body("friend_data.profile_pic")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Friend profile picture must be a string"),
];