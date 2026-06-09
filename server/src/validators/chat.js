import { body } from "express-validator";
import {
  channelIdValidator,
  channelNameValidator,
  messageContentValidator,
  profilePicValidator,
  serverIdValidator,
  tagValidator,
  timestampValidator,
  usernameValidator,
} from "./commonValidators.js";

export const storeMessageValidator = [
  messageContentValidator(),
  serverIdValidator(),
  channelIdValidator(),
  channelNameValidator(),
  timestampValidator(),
  usernameValidator(),
  tagValidator(),
  body("id").trim().notEmpty().withMessage("User ID is required"),
  profilePicValidator(),
];

export const getMessagesValidator = [serverIdValidator(), channelIdValidator()];

export const editServerMessageValidator = [
  serverIdValidator(),
  channelIdValidator(),
  timestampValidator(),
  messageContentValidator("content"),
];

export const deleteServerMessageValidator = [
  serverIdValidator(),
  channelIdValidator(),
  timestampValidator(),
];
