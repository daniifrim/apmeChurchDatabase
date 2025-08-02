# APME Church Database System

## Project Overview

This is a full-stack web application for APME (Romanian Pentecostal churches) to manage and track church data across Romania. It features an interactive map-based interface for church management, visit tracking, and engagement monitoring with role-based access control.

**AI Assistant Integration:**  
This project is designed to work closely with Gemini, an AI assistant that can not only help you with code and documentation, but also check and update the project's progress in the `@CHANGELOG.md` file. This means Gemini can automatically keep your progress documentation up to date as you work, making it easier to track milestones, completed tasks, and next steps.  
*Theory:* Keeping progress documentation in sync with actual development is crucial for team communication and project management. By letting Gemini update `@CHANGELOG.md`, you reduce manual work and ensure your documentation always reflects the current state of the project.

## Key Technologies

*   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query, Leaflet, Wouter
*   **Backend:** Node.js, Express.js, TypeScript, ESBuild
*   **Database:** PostgreSQL (via Neon serverless), Drizzle ORM
*   **Authentication:** Replit Auth (OpenID Connect), Passport.js, express-session

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up environment variables:**
    Create a `.env` file with the required variables (e.g., `DATABASE_URL`, `SESSION_SECRET`).
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  **Access the application:**
    The client will be available at `http://localhost:5173`.

## Available Scripts

*   `npm run dev`: Starts both the backend API and the frontend client in development mode.
*   `npm run dev:api`: Starts the backend API server using `tsx` for live reloading.
*   `npm run dev:client`: Starts the Vite development server for the frontend client.
*   `npm run build`: Builds the frontend application for production.
*   `npm run vercel-build`: An alias for the standard build command, likely for Vercel deployments.
*   `npm run start`: Starts the production server (expects the project to be built first).
*   `npm run check`: Runs the TypeScript compiler to check for type errors.
*   `npm run db:push`: Pushes database schema changes using Drizzle Kit.

## Project Structure
