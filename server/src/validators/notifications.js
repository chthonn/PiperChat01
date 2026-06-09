import {
  channelIdValidator,
  friendIdValidator,
  serverIdValidator,
} from "./commonValidators.js";

export const markDirectMessagesReadValidator = [friendIdValidator()];

export const markChannelReadValidator = [
  serverIdValidator(),
  channelIdValidator(),
];
