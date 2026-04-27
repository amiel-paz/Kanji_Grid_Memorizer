import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { createSchedulerPlan, getDueReviewKanji } from './domain/scheduler.js';
import type { ServerConfig } from './config.js';
import { FileSchedulerStore } from './store/fileSchedulerStore.js';

const reviewOutcomeSchema = z.object({
  kanji: z.string().min(1),
  reviewGrade: z.union([z.literal('again'), z.literal('good')]),
  reviewedAt: z.string().optional(),
});

const applyOutcomesSchema = z.object({
  outcomes: z.array(reviewOutcomeSchema).min(1),
  updatedAt: z.string().optional(),
});

const schedulerPlanSchema = z.object({
  asOf: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const getDueReviewKanjiSchema = z.object({
  now: z.string(),
  limit: z.number().int().positive().max(100),
});

export function createServerApp(config: ServerConfig, store: FileSchedulerStore) {
  const app = express();

  app.use(cors({ origin: config.allowedOrigin }));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'kanji-grid-review-scheduler',
    });
  });

  app.get('/api/v1/learners/:learnerId/scheduler', async (request, response, next) => {
    try {
      const learnerState = await store.loadLearnerState(request.params.learnerId);
      response.json(learnerState);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/v1/learners/:learnerId/scheduler', async (request, response, next) => {
    try {
      await store.resetLearnerState(request.params.learnerId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/learners/:learnerId/scheduler/review-outcomes', async (request, response, next) => {
    try {
      const payload = applyOutcomesSchema.parse(request.body);
      const learnerState = await store.applyReviewOutcomes(
        request.params.learnerId,
        payload.outcomes,
        payload.updatedAt,
      );
      response.status(201).json(learnerState);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/learners/:learnerId/scheduler/plan', async (request, response, next) => {
    try {
      const payload = schedulerPlanSchema.parse(request.body ?? {});
      const learnerState = await store.loadLearnerState(request.params.learnerId);
      const plan = createSchedulerPlan(learnerState, payload);
      response.json(plan);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/learners/:learnerId/due-review-kanji', async (request, response, next) => {
    try {
      const payload = getDueReviewKanjiSchema.parse(request.body);
      const learnerState = await store.loadLearnerState(request.params.learnerId);
      const dueItems = getDueReviewKanji(learnerState, payload);
      response.json(dueItems);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        error: 'invalid-request',
        issues: error.issues,
      });
      return;
    }

    response.status(500).json({
      error: 'internal-server-error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return app;
}
