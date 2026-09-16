# Daymark Full-Stack Todo

A production-oriented todo workspace with React, Vite, Express, a JSON file store, JWT authentication, bcrypt password hashing, and a user-private REST API.

## Features

- Register, login, logout, persisted JWT session, and protected routes
- Create, read, edit, complete, uncomplete, and delete todos
- Priority, category, description, due date, and timestamps
- Search, status/priority/category filters, and sorting
- Dashboard statistics, loading/error/empty states, responsive layout, and delete confirmation
- Every todo query is scoped by the authenticated `userId`

## Setup

Prerequisite: Node.js 18+.

1. Install dependencies: `npm run install:all`
2. Copy `.env.example` to `server/.env` and set a strong `JWT_SECRET`.
3. Start the API: `npm run dev:server`
4. In a second terminal, start the client: `npm run dev:client`
5. Open `http://localhost:5173`.

## Structure

- `client/` React/Vite application
- `client/src/components/` reusable UI components
- `client/src/context/` authentication context
- `client/src/services/` centralized API client
- `server/` Express API
- `server/utils/store.js` JSON persistence and ID generation
- `server/controllers/` request handlers
- `server/middleware/` JWT auth and async handling
- `server/routes/` API route definitions

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/todos`
- `GET /api/todos/:id`
- `POST /api/todos`
- `PUT/PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `GET /api/health`

Todo routes require `Authorization: Bearer <token>`. Passwords are hashed with bcrypt and never returned. JWTs expire after seven days. Data is stored in `server/data/store.json` and should be replaced with a hosted database before multi-instance production deployment.

## Build

Run `npm run build`.

## Screenshots

Add product screenshots here when deploying the application.

## Future improvements

Refresh-token rotation, automated integration tests, pagination, recurring tasks, and deployment CI.
