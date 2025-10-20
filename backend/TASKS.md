# Backend Tech & Core Setup

## Choose backend stack

- If Web module chosen: Fastify (Node.js) + SQLite.
- Dockerize everything → one command to launch.

## Database & API Skeleton

- Design DB schema: Users, Matches, Tournaments, Scores, Friends.
- Expose structured API (REST/WebSocket) for frontend.

## Authentication & User Management

- Secure registration/login.
- JWT-based sessions.
- Password hashing (bcrypt/argon2).
- 2FA (TOTP app, SMS, or email). [LEAVE TILL THE END]
- Remote authentication with Google Sign-in (OAuth2). [LEAVE TILL THE END]

## Gameplay Backend

- Real-time Pong logic handled server-side.
- WebSocket connection for live chat.
- WebSocket connections for multiplayer. [ONLY IF YOU WANT REMOTE PLAYERS MODULE BUT WARNING! IT'S DIFFICULT]
- Tournament system (matchmaking, brackets, scores).

## Security

- Enforce HTTPS / WSS everywhere.
- Protect against SQL Injection & XSS.
- Secrets management with Vault.
- Add GDPR compliance endpoints (account deletion, anonymization).

## Deployment / DevOps

- Backend runs in Docker.
- Logs & monitoring (if modules chosen).
- Prepare backend as microservices (auth, game, chat, etc.).
