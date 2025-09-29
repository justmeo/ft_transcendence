# ft_transcendence Documentation

## Architecture Overview

This project follows a modern web application architecture with:

- **Frontend**: TypeScript SPA (Single Page Application)
- **Backend**: Node.js with Fastify framework
- **Database**: SQLite for development
- **Containerization**: Docker for development environment

## Directory Structure

- `frontend/` - React/TypeScript frontend application
- `backend/` - Node.js/Fastify API server
- `db/` - Database schemas and migrations
- `docker/` - Docker configuration files
- `docs/` - Project documentation

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Run `docker-compose up` in the `docker/` directory

## Development Workflow

### Frontend Development
- Navigate to `frontend/` directory
- Run `npm install` to install dependencies
- Run `npm run dev` for development server

### Backend Development
- Navigate to `backend/` directory
- Run `npm install` to install dependencies
- Run `npm run dev` for development server

## API Documentation

API endpoints and usage will be documented here as they are implemented.

## Database Schema

Database schema is defined in `db/schema.sql`. Initialize the database by running the SQL commands in your SQLite client.