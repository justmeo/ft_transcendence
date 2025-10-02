# Backend: Getting Started

## 1. Prerequisite

- Install [Docker](https://www.docker.com/)

## 2. Configure Environment

Copy `.env.example` to `.env` and update secrets:

```bash
cp backend/.env.example backend/.env
```

## 3. Build Docker Image

```bash
docker build -t ft_backend backend
```

## 4. Run Backend Server in Docker

```bash
docker run --env-file backend/.env -p 3000:3000 ft_backend
```

This will start the backend server inside a Docker container. You do not need Node.js or SQLite CLI installed locally.

## 5. Next Steps

- Implement API endpoints (users, matches, tournaments, etc.)
- Set up authentication (JWT, password hashing)
- Add WebSocket support for real-time gameplay

## 6. Useful Commands

- Test API: `curl http://localhost:3000/health`
- Build Docker image: `docker build -t ft_backend backend`



# Test the root endpoint
curl http://localhost:80/

# Test if HTTPS redirect is working
curl -I http://localhost:80/

# Test an API endpoint that might exist
curl http://localhost:80/api/

# Check if the proxy is handling requests correctly
curl -v http://localhost:80/api/health