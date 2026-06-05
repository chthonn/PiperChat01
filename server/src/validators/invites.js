import { body } from "express-validator";
import { serverIdValidator } from "./commonValidators.js";

export const createInviteLinkValidator = [
  body("inviter_name")
    .trim()
    .notEmpty()
    .withMessage("Inviter name is required"),

  body("inviter_id")
    .trim()
    .notEmpty()
    .withMessage("Inviter ID is required"),

  body("server_name")
    .trim()
    .notEmpty()
    .withMessage("Server name is required"),

  serverIdValidator(),

  body("server_pic")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Server picture must be a string"),
];

export const inviteLinkInfoValidator = [
  body("invite_link")
    .trim()
    .notEmpty()
    .withMessage("Invite link is required"),
];

export const acceptInviteValidator = [
  body("user_details")
    .notEmpty()
    .withMessage("User details are required")
    .isObject()
    .withMessage("User details must be an object"),

  body("user_details.id")
    .trim()
    .notEmpty()
    .withMessage("User ID is required"),

  body("server_details")
    .notEmpty()
    .withMessage("Server details are required")
    .isObject()
    .withMessage("Server details must be an object"),

  body("server_details.invite_details")
    .notEmpty()
    .withMessage("Invite details are required")
    .isObject()
    .withMessage("Invite details must be an object"),

  body("server_details.invite_details.server_id")
    .trim()
    .notEmpty()
    .withMessage("Server ID is required"),
];