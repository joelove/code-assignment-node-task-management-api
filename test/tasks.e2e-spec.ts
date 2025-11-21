import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TasksController (e2e)', () => {
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
      console.log(taskId);
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
