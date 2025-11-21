import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

describe("TasksController (Performance)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const now = () => Date.now();
  const msSince = (start: number) => Date.now() - start;

  type SeedContext = {
    runId: string;
    projectId: string;
    assigneeUserId: string;
  };

  async function setupSeedContext(): Promise<SeedContext> {
    const user = await prisma.user.create({
      data: { email: `perf-user-${Date.now()}@example.com`, name: "Perf User" },
    });

    const project = await prisma.project.create({
      data: { name: "Perf Project" },
    });

    const runId = Date.now().toString(36);
    const projectId = project.id;
    const assigneeUserId = user.id;

    return { runId, projectId, assigneeUserId };
  }

  async function seedExactlyTasks(count: number, ctx: SeedContext) {
    const batchSize = 250;
    const statuses = Object.values(TaskStatus);
    const priorities = Object.values(TaskPriority);

    let created = 0;

    while (created < count) {
      const size = Math.min(batchSize, count - created);
      const nowMs = Date.now();
      const data = Array.from({ length: size }, (_, i) => {
        const seq = created + i + 1;
        const status = statuses[seq % statuses.length];
        const priority = priorities[seq % priorities.length];
        const evenSeq = seq % 2 === 0;
        const dueDate = evenSeq
          ? new Date(nowMs + (seq % 30) * 24 * 60 * 60 * 1000)
          : null;

        return {
          title: `Perf Task [${ctx.runId}] #${seq}`,
          description: `Performance seed task ${seq}`,
          status,
          priority,
          projectId: ctx.projectId,
          assigneeId: ctx.assigneeUserId,
          dueDate,
        };
      });

      await prisma.task.createMany({ data });
      created += size;
    }
  }

  async function cleanupSeed(ctx: SeedContext) {
    await prisma.task.deleteMany({
      where: { projectId: ctx.projectId },
    });
    await prisma.project.deleteMany({
      where: { id: ctx.projectId },
    });
    await prisma.user.deleteMany({
      where: { id: ctx.assigneeUserId },
    });
  }

  const baselineFile = path.resolve(__dirname, "tasks.perf.json");

  type Baseline = Record<string, number>;

  const baseline: Baseline = {};

  function saveBaseline() {
    fs.writeFileSync(
      baselineFile,
      JSON.stringify(
        { capturedAt: new Date().toISOString(), metrics: baseline },
        null,
        2
      )
    );
  }

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

  let seedCtx: SeedContext;

  beforeAll(async () => {
    prisma = new PrismaClient();
    seedCtx = await setupSeedContext();

    await seedExactlyTasks(1000, seedCtx);
  });

  afterAll(async () => {
    await cleanupSeed(seedCtx);
    await prisma.$disconnect();
  });

  describe("Baseline capture (saved to perf.json)", () => {
    it("GET /tasks with ~1000 tasks", async () => {
      const start = now();
      const res = await request(app.getHttpServer()).get("/tasks").expect(200);

      baseline["get_all_ms"] = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /tasks x5 concurrent", async () => {
      const server = app.getHttpServer();
      const start = now();
      const settled = await Promise.allSettled(
        Array.from({ length: 5 }).map(() =>
          request(server).get("/tasks").expect(200)
        )
      );
      const ok = settled.filter(
        (r) => r.status === "fulfilled"
      ) as PromiseFulfilledResult<request.Response>[];

      expect(ok.length).toBeGreaterThan(0);

      baseline["get_all_concurrent5_total_ms"] = msSince(start);

      ok.forEach((r) => expect(Array.isArray(r.value.body)).toBe(true));
    });

    it("POST /tasks with assignee (measures assignment delay)", async () => {
      const payload = {
        title: `Assignment delay probe [${seedCtx.runId}]`,
        description: "Measuring assignment latency",
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: seedCtx.projectId,
        assigneeId: seedCtx.assigneeUserId,
      };

      const start = now();
      const res = await request(app.getHttpServer())
        .post("/tasks")
        .send(payload)
        .expect(201);

      baseline["post_with_assignee_ms"] = msSince(start);

      expect(res.body).toHaveProperty("id");
    });

    it("GET /tasks?status=COMPLETED", async () => {
      const start = now();
      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ status: TaskStatus.COMPLETED })
        .expect(200);

      baseline["filter_status_completed_ms"] = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /tasks with date range and assignee", async () => {
      const startDate = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const endDate = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      const start = now();
      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({
          assigneeId: seedCtx.assigneeUserId,
          dueDateFrom: startDate,
          dueDateTo: endDate,
        })
        .expect(200);

      baseline["filter_assignee_and_date_ms"] = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
    });

    afterAll(() => {
      // Final save to ensure metrics are persisted
      saveBaseline();
    });
  });

  describe("Target thresholds (expected to fail until refactor)", () => {
    it("GET /tasks with ~1000 tasks under 100ms", async () => {
      const start = now();
      const res = await request(app.getHttpServer()).get("/tasks").expect(200);
      const durationMs = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
      expect(durationMs).toBeLessThan(100);
    });

    it("GET /tasks x5 concurrent under 1000ms total", async () => {
      const server = app.getHttpServer();
      const start = now();

      const settled = await Promise.allSettled(
        Array.from({ length: 5 }).map(() =>
          request(server).get("/tasks").expect(200)
        )
      );

      const totalMs = msSince(start);

      const ok = settled.filter(
        (r) => r.status === "fulfilled"
      ) as PromiseFulfilledResult<request.Response>[];

      expect(ok.length).toBeGreaterThan(0);

      ok.forEach((r) => expect(Array.isArray(r.value.body)).toBe(true));

      expect(totalMs).toBeLessThan(1000);
    });

    it("POST /tasks with assignee under 100ms", async () => {
      const payload = {
        title: `Target assignment [${seedCtx.runId}]`,
        description: "Target threshold",
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: seedCtx.projectId,
        assigneeId: seedCtx.assigneeUserId,
      };

      const start = now();
      const res = await request(app.getHttpServer())
        .post("/tasks")
        .send(payload)
        .expect(201);

      const durationMs = msSince(start);

      expect(res.body).toHaveProperty("id");
      expect(durationMs).toBeLessThan(100);
    });

    it("GET /tasks?status=COMPLETED under 100ms", async () => {
      const start = now();
      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({ status: TaskStatus.COMPLETED })
        .expect(200);

      const durationMs = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
      expect(durationMs).toBeLessThan(100);
    });

    it("GET /tasks with date range and assignee under 100ms", async () => {
      const startDate = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const endDate = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      const start = now();
      const res = await request(app.getHttpServer())
        .get("/tasks")
        .query({
          assigneeId: seedCtx.assigneeUserId,
          dueDateFrom: startDate,
          dueDateTo: endDate,
        })
        .expect(200);

      const durationMs = msSince(start);

      expect(Array.isArray(res.body)).toBe(true);
      expect(durationMs).toBeLessThan(100);
    });
  });
});
