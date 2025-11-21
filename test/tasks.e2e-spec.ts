import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";

describe("TasksController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      })
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("/tasks", () => {
    let response: request.Response;

    beforeEach(async () => {
      response = await request(app.getHttpServer()).get("/tasks").expect(200);
    });

    it("returns a list of tasks", async () => {
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      response.body.forEach((task) => {
        expect(task).toHaveProperty("assignee");
        expect(task).toHaveProperty("project");
        expect(task).toHaveProperty("tags");
      });
    });

    it("filters by status", async () => {
      const status = response.body[0].status;

      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ status })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((t: any) => {
        expect(t.status).toBe(status);
        expect(t).toHaveProperty("assignee");
        expect(t).toHaveProperty("project");
        expect(t).toHaveProperty("tags");
      });
    });

    it("filters by priority", async () => {
      const priority = response.body[0].priority;

      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ priority })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((t: any) => {
        expect(t.priority).toBe(priority);
      });
    });

    it("filters by projectId", async () => {
      const projectId = response.body[0].projectId;

      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ projectId })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((t: any) => {
        expect(t.projectId).toBe(projectId);
      });
    });

    it("filters by assigneeId", async () => {
      const assigneeId = response.body[0].assigneeId;

      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ assigneeId })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((t: any) => {
        expect(t.assigneeId).toBe(assigneeId);
      });
    });

    it("filters by due date range", async () => {
      const sortedDueDates = response.body
        .map((t: any) => t.dueDate)
        .filter(Boolean)
        .map((d: string) => new Date(d).getTime())
        .sort((a: number, b: number) => a - b);

      const targetMs = sortedDueDates[Math.floor(sortedDueDates.length / 2)];
      const oneDayMs = 24 * 60 * 60 * 1000;
      const startDate = new Date(targetMs - oneDayMs).toISOString();
      const endDate = new Date(targetMs + oneDayMs).toISOString();

      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ dueDateFrom: startDate, dueDateTo: endDate })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((t: any) => {
        const td = new Date(t.dueDate).getTime();
        expect(td).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(td).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });
  });

  describe("/tasks/:id", () => {
    let response: request.Response;
    let taskId: string;

    beforeAll(async () => {
      const tasks = await request(app.getHttpServer())
        .get("/tasks")
        .expect(200);

      taskId = tasks.body[0].id;
    });

    beforeEach(async () => {
      response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);
    });

    it("returns a task", async () => {
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("description");
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("priority");
      expect(response.body).toHaveProperty("dueDate");
      expect(response.body).toHaveProperty("assignee");
      expect(response.body).toHaveProperty("project");
    });
  });
});
