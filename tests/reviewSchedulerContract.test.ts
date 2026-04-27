import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createServerApp } from '../server/src/app';
import { FileSchedulerStore } from '../server/src/store/fileSchedulerStore';

interface TestServerHandle {
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
}

const openServers: TestServerHandle[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe('review scheduler HTTP contract', () => {
  it('returns explicit due review items through the backend contract', async () => {
    const server = await startTestServer();
    openServers.push(server);

    const learnerId = 'learner-1';
    await fetch(`${server.baseUrl}/api/v1/learners/${learnerId}/scheduler/review-outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outcomes: [
          {
            kanji: '力',
            reviewGrade: 'good',
            reviewedAt: '2026-04-20T10:00:00.000Z',
          },
          {
            kanji: '水',
            reviewGrade: 'good',
            reviewedAt: '2026-04-18T10:00:00.000Z',
          },
          {
            kanji: '水',
            reviewGrade: 'good',
            reviewedAt: '2026-04-19T10:00:00.000Z',
          },
          {
            kanji: '水',
            reviewGrade: 'again',
            reviewedAt: '2026-04-22T10:00:00.000Z',
          },
        ],
        updatedAt: '2026-04-22T10:00:00.000Z',
      }),
    });

    const response = await fetch(`${server.baseUrl}/api/v1/learners/${learnerId}/due-review-kanji`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        now: '2026-04-23T12:00:00.000Z',
        limit: 1,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      learnerId,
      asOf: '2026-04-23T12:00:00.000Z',
      items: [
        {
          kanji: '力',
          dueAt: '2026-04-21T10:00:00.000Z',
          status: 'learning',
          intervalDays: 1,
        },
      ],
      remainingDueCount: 1,
    });
  });

  it('can clear one learner scheduler state without pretending to reset other learners', async () => {
    const server = await startTestServer();
    openServers.push(server);

    await fetch(`${server.baseUrl}/api/v1/learners/local-learner/scheduler/review-outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outcomes: [
          {
            kanji: '力',
            reviewGrade: 'good',
            reviewedAt: '2026-04-20T10:00:00.000Z',
          },
        ],
      }),
    });
    await fetch(`${server.baseUrl}/api/v1/learners/other-learner/scheduler/review-outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outcomes: [
          {
            kanji: '水',
            reviewGrade: 'good',
            reviewedAt: '2026-04-20T10:00:00.000Z',
          },
        ],
      }),
    });

    const resetResponse = await fetch(
      `${server.baseUrl}/api/v1/learners/local-learner/scheduler`,
      {
        method: 'DELETE',
      },
    );

    expect(resetResponse.status).toBe(204);

    const clearedLearnerState = await fetch(
      `${server.baseUrl}/api/v1/learners/local-learner/scheduler`,
    );
    const otherLearnerState = await fetch(
      `${server.baseUrl}/api/v1/learners/other-learner/scheduler`,
    );

    expect(await clearedLearnerState.json()).toEqual({
      learnerId: 'local-learner',
      recordsByKanji: {},
      updatedAt: expect.any(String),
    });
    expect(await otherLearnerState.json()).toEqual({
      learnerId: 'other-learner',
      recordsByKanji: {
        水: {
          kanji: '水',
          status: 'learning',
          successCount: 1,
          lapseCount: 0,
          intervalDays: 1,
          dueAt: '2026-04-21T10:00:00.000Z',
          lastReviewedAt: '2026-04-20T10:00:00.000Z',
          lastGrade: 'good',
        },
      },
      updatedAt: expect.any(String),
    });
  });
});

async function startTestServer(): Promise<TestServerHandle> {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'kanji-grid-review-scheduler-'));
  const dataFilePath = join(tempDirectory, 'learner-scheduler.json');
  const app = createServerApp(
    {
      allowedOrigin: 'http://localhost:5173',
      dataFilePath,
      port: 0,
    },
    new FileSchedulerStore(dataFilePath),
  );
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an inet server address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      await rm(tempDirectory, { force: true, recursive: true });
    },
  };
}
