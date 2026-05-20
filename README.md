<p align="center">
  <img alt="Piper" src="https://img.shields.io/badge/Piper-7C5CFC?style=for-the-badge">
  <img alt="Chat" src="https://img.shields.io/badge/Chat-22D3EE?style=for-the-badge">
</p>

<p align="center">
  Discord-style chat app • Vite + Tailwind • Express + MongoDB • Socket.IO
</p>

<p align="center">
  <a href="https://youtu.be/jZi9OCY6gsk">Watch the demo video</a>
</p>

<p align="center">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-React-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-ESM-339933?logo=node.js&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO--010101?logo=socket.io&logoColor=white">
</p>

## What is this?

PiperChat is a Discord-style chat app with:

- Direct Messages + Servers/Channels
- Realtime updates via Socket.IO
- Presence + unread counts
- Email OTP verification
- Profile updates (display name + avatar) with Supabase storage
- Optional Redis caching (Upstash supported)

---

# Project Structure

- `server/` → Express + MongoDB + Socket.IO API (ESM)
- `frontend/` → Vite + Tailwind UI

---

# System Architecture

```mermaid
graph TD
    User((User)) -->|Interacts| UI[Vite + React Frontend]

    UI <-->|Real-time Events| Socket[Socket.io Layer]
    UI -->|HTTP Requests| API[Express API]

    subgraph "Server Logic (Node.js)"
        API
        Socket
        Auth[JWT Authentication]
        Email[Gmail OAuth2 Email Service]
    end

    Socket <-->|Caching/Presence| Redis[(Redis)]
    API -->|Chat History & Users| Mongo[(MongoDB)]
    Email -->|Send OTP via Gmail| GoogleOAuth[(Google OAuth2 API)]

    style UI fill:#9b5de5,stroke:#333,stroke-width:2px,color:#fff
    style Redis fill:#FF4438,color:#fff
    style Mongo fill:#47A248,color:#fff
    style GoogleOAuth fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
```

---

# Quick Start

## 1) Install Dependencies

```bash
cd server && npm install
cd ../frontend && npm install
```

---

## 2) Environment Variables

- Copy `PiperChat01/.env.example` → `PiperChat01/.env`
- Copy `PiperChat01/frontend/.env.example` → `PiperChat01/frontend/.env`

---

## 3) Run the Applications

### Backend

```bash
cd server
npm start
```

### Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

Backend runs on:

```txt
http://localhost:2000
```

---

# Environment Variables

## Server (`PiperChat01/.env`)

| Key                                                              | Required | Notes                                  |
| ---------------------------------------------------------------- | -------: | -------------------------------------- |
| `MONGO_URI`                                                      |       ✅ | MongoDB connection string              |
| `ACCESS_TOKEN`                                                   |       ✅ | JWT secret                             |
| `PORT`                                                           |       ❌ | Default `2000`                         |
| `default_profile_pic`                                            |       ✅ | Used on signup                         |
| `MAIL_USER` / `MAIL_PASS`                                        |       ✅ | Gmail App Password flow                |
| `OAUTH_CLIENTID` / `OAUTH_CLIENT_SECRET` / `OAUTH_REFRESH_TOKEN` |       ❌ | Optional OAuth2 email sending          |
| `REDIS_URL`                                                      |       ❌ | Upstash URL supported (`rediss://...`) |
| `REDIS_CACHE_TTL_SECONDS`                                        |       ❌ | Default `30`                           |

---

## Frontend (`PiperChat01/frontend/.env`)

| Key                           | Required | Notes                                  |
| ----------------------------- | -------: | -------------------------------------- |
| `REACT_APP_URL`               |       ✅ | Backend URL (`http://localhost:2000`)  |
| `REACT_APP_front_end_url`     |       ✅ | Frontend URL (`http://localhost:5173`) |
| `REACT_APP_SUPABASE_URL`      |       ❌ | For avatar uploads                     |
| `REACT_APP_SUPABASE_ANON_KEY` |       ❌ | For avatar uploads                     |
| `REACT_APP_SUPABASE_BUCKET`   |       ❌ | For avatar uploads                     |

---

# Scripts

## Server

```bash
npm start
npm test
```

### Available Commands

| Command | Description |
| --- | --- |
| `npm start` | Runs backend using nodemon |
| `npm test` | Runs backend integration tests |

---

## Frontend

```bash
npm run dev
npm run build
npm run lint
```

---

# Backend Testing

The backend now includes integration testing support using:

- Vitest
- Supertest
- MongoMemoryServer

---

## Running Backend Tests

```bash
cd server
npm install
npm test
```

---

## Testing Features

### Current Integration Coverage

- Authentication signup flow
- OTP verification flow
- Signin flow
- Friend request send flow
- Friend request accept flow
- Friend request ignore flow

---

## Testing Architecture

### Isolated Database

Tests run using:

```txt
MongoMemoryServer
```

This means:

- No production MongoDB Atlas database is used
- No external database credentials are required
- Each test suite runs in isolation
- Database state is automatically cleaned after tests

---

### Mocked External Services

External email services are mocked during tests.

This ensures:

- No real emails are sent
- Faster test execution
- Deterministic OTP verification
- Stable CI/CD behavior

---

## Test Structure

```txt
server/tests/
├── auth.test.js
├── friend.test.js
├── mocks.js
└── setup.js
```

---

# CI Checks

This repository uses GitHub Actions to run automated checks on every pull request and push to `main`.

Current CI checks include:

- Frontend dependency install with `npm ci`
- Frontend linting with `npm run lint`
- Frontend production build with `npm run build`
- Backend dependency install with `npm ci`

Future backend CI can additionally run:

```bash
cd server
npm test
```

to validate integration test coverage automatically.

---

# Local CI Validation

## Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
```

---

## Backend

```bash
cd server
npm ci
npm test
```