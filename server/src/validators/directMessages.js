import {
  friendIdValidator,
  messageContentValidator,
  timestampValidator,
} from "./commonValidators.js";

export const getDirectMessagesValidator = [friendIdValidator()];

export const sendDirectMessageValidator = [
  friendIdValidator(),
  messageContentValidator("content"),
];

export const editDirectMessageValidator = [
  friendIdValidator(),
  timestampValidator(),
  messageContentValidator("content"),
];

export const deleteDirectMessageValidator = [
  friendIdValidator(),
  timestampValidator(),
];
