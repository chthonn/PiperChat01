/**
 * Obtain a Gmail OAuth2 refresh token (scope: gmail.send).
 * Redirect URI in Google Cloud: http://localhost:53682/oauth2callback
 *
 * Usage: cd server && npm run gmail:oauth-setup
 */
import "dotenv/config";

import config from "../src/config/index.js";

import { createServer } from "http";
import { OAuth2Client } from "google-auth-library";
import { GMAIL_SEND_SCOPE } from "../src/lib/gmailOAuth.js";

const REDIRECT_URI = "http://localhost:53682/oauth2callback";

const clientId =
  config.OAUTH_CLIENT_ID || "";
const clientSecret = config.OAUTH_CLIENT_SECRET || "";

if (!clientId || !clientSecret) {
  console.error("Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [GMAIL_SEND_SCOPE],
});

function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", "http://localhost:53682");
        if (url.pathname !== "/oauth2callback") {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h1>Failed</h1><p>${error}</p>`);
          server.close();
          reject(new Error(error));
          return;
        }

        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Missing code</h1>");
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Success</h1><p>Return to the terminal.</p>");
        server.close();
        resolve(code);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(53682, () => {
      console.log("\nOpen in browser (sign in as the Gmail that sends OTPs):\n");
      console.log(authUrl);
      console.log();
    });
    server.on("error", reject);
  });
}

async function main() {
  const code = await waitForAuthCode();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "No refresh_token. Revoke app at https://myaccount.google.com/permissions and retry."
    );
    process.exit(1);
  }

  console.log("\n--- Add to .env ---\n");
  console.log('MAIL_TRANSPORT="gmail_api"');
  console.log('MAIL_USER="<your-sender@gmail.com>"');
  console.log(`OAUTH_CLIENT_ID="${clientId}"`);
  console.log(`OAUTH_CLIENT_SECRET="${clientSecret}"`);
  console.log(`OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);
  console.log("\nRemove MAIL_PASS. Redeploy your server after updating environment variables.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
