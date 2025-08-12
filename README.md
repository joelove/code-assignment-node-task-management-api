# Task Management API - Take-Home Assignment

> Description of your take-home assignment can be found in [`TASK_DESCRIPTION.md`](TASK_DESCRIPTION.md).

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start Docker containers:
```bash
docker-compose up -d
```

3. Run database migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Seed the database:
```bash
npm run seed
```

5. Start the application:
```bash
npm run start:dev
```

The API will be available at http://localhost:3000

## Available Endpoints

- GET /tasks - List all tasks with filters
- GET /tasks/:id - Get a single task
- POST /tasks - Create a new task
- PUT /tasks/:id - Update a task
- DELETE /tasks/:id - Delete a task
- GET /projects - List all projects
- GET /users - List all users

## Task Filters

The GET /tasks endpoint supports the following query parameters:
- status: TODO, IN_PROGRESS, COMPLETED, CANCELLED
- priority: LOW, MEDIUM, HIGH, URGENT
- assigneeId: UUID of the assignee
- projectId: UUID of the project
- dueDateFrom: ISO date string
- dueDateTo: ISO date string

Example: GET /tasks?status=TODO&priority=HIGH
