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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/tasks', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);

    response.body.forEach(task => {
      expect(task).toHaveProperty('assignee');
      expect(task).toHaveProperty('project');
      expect(task).toHaveProperty('tags');
    });
  });

});
