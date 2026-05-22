import { OAuth2Client } from "google-auth-library";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function getMailUser() {
  return (process.env.EMAIL_USER || process.env.MAIL_USER || "").trim();
}

export function getOAuthClientId() {
  return (
    process.env.OAUTH_CLIENT_ID ||
    process.env.OAUTH_CLIENTID ||
    ""
  ).trim();
}

export function hasGmailOAuthCredentials() {
  return Boolean(
    getMailUser() &&
      getOAuthClientId() &&
      process.env.OAUTH_CLIENT_SECRET?.trim() &&
      process.env.OAUTH_REFRESH_TOKEN?.trim()
  );
}

export function createGmailOAuth2Client() {
  const client = new OAuth2Client(
    getOAuthClientId(),
    process.env.OAUTH_CLIENT_SECRET.trim()
  );
  client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN.trim(),
  });
  return client;
}
