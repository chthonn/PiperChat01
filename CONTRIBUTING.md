# Contributing to PiperChat

Thanks for helping improve PiperChat. This project has a Vite/React frontend and an Express/MongoDB/Socket.IO backend. Keep changes focused, clear, and easy to review.

## Pull Request Format

Open focused pull requests. A PR should solve one bug, add one feature, or improve one area of documentation.

Use this structure in the PR description:

```md
## Summary
- What changed?
- Why is this needed?

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Refactor
- [ ] Tooling / developer experience

## Validation
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run build`
- [ ] Server starts with `cd server && npm start`, if backend code changed
- [ ] I checked the feature or page I changed in the app

## Screenshots or Recording
Add before/after images for visible UI changes.

## Notes for Reviewers
Mention anything reviewers should know.
```

PR descriptions should explain what changed and why. For UI changes, add screenshots. For bug fixes, include the steps you used to check the fix.

## Commit Message Conventions

Use this commit style:

```text
type(scope): short imperative summary
```

Good examples:

```text
feat(chat): add unread count sync
fix(auth): handle expired OTP verification
docs: add setup notes for environment variables
refactor(server): simplify invite lookup
chore(frontend): update lint configuration
```

Preferred types are:

- `feat` for user-facing features
- `fix` for defects
- `docs` for documentation-only changes
- `refactor` for behavior-preserving code changes
- `test` for test-only changes
- `chore` for maintenance, dependencies, and tooling

Keep commit messages short and specific. Avoid vague messages like `updates`, `changes`, or `fix stuff`.

## Local Environment Setup

PiperChat has separate frontend and backend environment files. Before running the app locally:

1. Copy `server/.env.example` to `server/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Fill in the required values for `MONGO_URI`, `ACCESS_TOKEN`, `VITE_URL`, and `VITE_FRONT_END_URL`.

Optional services:

- **Email OTP**: set `MAIL_TRANSPORT`, `MAIL_USER`, and `MAIL_PASS` if you want real email delivery. For Gmail, use an App Password rather than your regular login password.
- **Avatar uploads**: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_BUCKET` if you want profile image uploads to work. The app still runs without Supabase, but avatar uploads will be disabled.

If these values are missing, you may see login, verification, or profile-image behavior fail locally even when the UI loads correctly.

## Test Expectations

Before requesting review, run the checks that apply to your change.

For frontend changes:

```bash
cd frontend
npm run lint
npm run build
```

For backend changes:

```bash
cd server
npm start
```

After starting the app, manually try the thing you changed. For example, if you changed login, try logging in. If you changed chat, send a message and check that it appears.

There is currently no dedicated automated test script in `frontend/package.json` or `server/package.json`. Until one is added, write a short note in the PR explaining what you checked manually.

Useful checks:

- Auth: sign up, verify OTP, sign in, and sign out.
- Chat: send a message, switch channels, and check direct messages.
- Servers and invites: create a server, join with an invite, and try an invalid invite.
- Profile: update display name or avatar if that area changed.
- Docs: make sure commands, paths, ports, and environment variable names are correct.

## Automated Checks

GitHub Actions runs checks automatically when someone opens or updates a pull request.

The main CI workflow checks:

- Frontend dependencies install correctly.
- Frontend lint passes.
- Frontend build passes.
- Backend dependencies install correctly.

The Vouch workflows help with contributor trust:

- Comment `vouch @username` on an issue or PR to add someone to `.github/VOUCHED.td`.
- Comment `denounce @username` to add someone to `.github/DENOUNCED.td`.
- New and updated PRs are checked against the Vouch lists.

If a check fails, open the failed GitHub Actions job, read the error, fix it locally, and push another commit. GitHub will run the checks again automatically.

## Code Style

Follow the style already used in the codebase.

- Use JavaScript ES modules.
- Keep React components in PascalCase.
- Keep variables and functions in camelCase.
- Keep imports tidy.
- Reuse the existing Redux, React Router, Socket.IO, and service patterns.
- Use Tailwind classes where nearby code does.
- Keep API responses consistent with the current format.
- Do not commit secrets, `.env` files, `node_modules`, or build output.

Run ESLint for frontend code before review:

```bash
cd frontend
npm run lint
```

## Review Timeline

Maintainers usually try to give an initial response within 2 to 3 business days. Small bug fixes and docs changes may be reviewed faster. Larger frontend, backend, auth, or realtime changes may take longer.

To keep review moving, respond to requested changes when you can. Clear notes, screenshots, and a focused PR make review much easier.
