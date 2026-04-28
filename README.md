# QuizBlitz

QuizBlitz is a real-time quiz hosting platform built with an Express + TypeScript backend, MongoDB, Socket.IO, Google OAuth, and email-based co-host invitations. The repository is split into a lightweight client folder with static pages and a server folder that handles authentication, quiz management, scoring, real-time gameplay, and operational logging.

## What It Does

- Google sign-in for users and co-hosts
- JWT-based session handling with access and refresh cookies
- Quiz creation, editing, deletion, and question management
- Room-code based quiz access for live sessions
- Real-time question publishing, answer submission, and scoring with Socket.IO
- Host and co-host collaboration through invitation emails
- Automatic cleanup for non-permanent attempted quizzes
- Production logging to Axiom through Winston

## Tech Stack

- Backend: Express, TypeScript, Node.js
- Database: MongoDB with Mongoose
- Authentication: Google OAuth, JWT, cookie-parser
- Realtime: Socket.IO
- Email: Nodemailer with Gmail SMTP
- Logging: Winston and Axiom transport
- Scheduling: node-cron

## Main Features

### Authentication and Accounts

- Google OAuth sign-in creates or updates users automatically.
- Access tokens and refresh tokens are stored in cookies for session continuity.
- Logout clears the active cookies and removes the refresh-token session from the user record.

### Quiz Management

- Owners can create quizzes with a title, description, start time, and permanence flag.
- Quizzes generate an 8-character room code for joining live sessions.
- Owners and co-hosts can load quiz metadata and manage questions.
- Questions support 2 to 5 options, a time limit, and a correct option index.

### Co-Host Invitations

- Owners can invite co-hosts by email.
- Invitations are sent differently for existing users and new users.
- Acceptance uses a tokenized invite flow and Google OAuth verification.
- A quiz can have up to three hosts total.

### Live Quiz Play

- Hosts publish questions to a socket room in real time.
- Attendees join rooms by room code.
- The server tracks submissions, auto-submissions, per-question answer stats, and leaderboard state.
- Scoring includes a fast-answer bonus and streak-based bonus points.

### Operations and Reliability

- A daily cron job removes attempted quizzes that are not marked permanent.
- Logging writes to a local file and, in production, to Axiom.

## Project Structure

```text
client/
	acceptInvite.html
	index.html
	logout.html
	quizDashboard.html
	success.html

server/
	src/
		auth/
		controllers/
		emailService/
		routes/
		schemas/
		db.ts
		index.ts
		logger.ts
		socket.ts
```

## Important Backend Modules

- [server/src/index.ts](server/src/index.ts) boots the app, connects to MongoDB, mounts routes, starts Socket.IO, and schedules cleanup.
- [server/src/auth/generateAndVerifyToken.ts](server/src/auth/generateAndVerifyToken.ts) handles access and refresh token creation and verification.
- [server/src/controllers/user.controller.ts](server/src/controllers/user.controller.ts) handles Google OAuth, logout, co-host invitations, and host membership changes.
- [server/src/controllers/quiz.controller.ts](server/src/controllers/quiz.controller.ts) handles quiz CRUD, question CRUD, and room-code lookup.
- [server/src/socket.ts](server/src/socket.ts) manages live quiz rooms, submissions, scoring, and leaderboard state.
- [server/src/logger.ts](server/src/logger.ts) sends logs to a local file and optionally to Axiom in production.
- [server/src/schemas/*.ts](server/src/schemas) define the MongoDB models for users, quizzes, and questions.

## Setup

### Prerequisites

- Node.js 18+ recommended
- pnpm
- MongoDB database
- Google OAuth credentials
- Gmail account or SMTP credentials for email delivery
- Axiom ingest credentials if you want production logging there

### Environment Variables

Create a server `.env` file with the values used by the backend:

```env
PORT=3000
MONGODB_URL=
DATABASE_NAME=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=7d
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=30d

COHOST_TOKEN_SECRET=
COHOST_TOKEN_EXPIRY=24h

EMAIL_USER=
EMAIL_PASSWORD=

AXIOM_DATASET_NAME=
AXIOM_INGEST_TOKEN=
NODE_ENV=development
```

### Install and Run

```bash
cd server
pnpm install
pnpm dev
```

For a production build:

```bash
cd server
pnpm build
pnpm start
```

## Local Usage Notes

- The backend redirects several auth flows to `http://localhost:5500/client/...`, so the client pages should be served from that origin during local development.
- The health endpoint is available at `/api/v1/health`.
- Quiz and user APIs are mounted under `/api/v1`.

## API Overview

### User Routes

- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- `GET /api/v1/`
- `POST /api/v1/logout/`
- `POST /api/v1/co-host/:quizId`
- `GET /api/v1/accept/:token`
- `GET /api/v1/co-host/accept/callback`
- `DELETE /api/v1/:quizId/co-host`
- `DELETE /api/v1/:quizId/leave`

### Quiz Routes

- `POST /api/v1/quiz/`
- `GET /api/v1/quiz/`
- `GET /api/v1/quiz/:quizId`
- `DELETE /api/v1/quiz/:quizId`
- `PATCH /api/v1/quiz/:quizId`
- `POST /api/v1/quiz/questions/:quizId`
- `DELETE /api/v1/quiz/questions/:quizId`
- `PATCH /api/v1/quiz/questions/:quizId`
- `GET /api/v1/quiz/room/:roomCode`

## Data Model Summary

- Users store `username`, `email`, and refresh-token sessions.
- Quizzes store hosts, room code, questions, title, description, attempt status, permanence, and start time.
- Questions store the prompt, options, time limit, and correct option index.

## Notes

- A quiz room uses Socket.IO events to keep the live session synchronized.
- Attempted non-permanent quizzes are deleted automatically by the scheduled cleanup job.
- The scoring logic rewards early correct answers and streak consistency.
