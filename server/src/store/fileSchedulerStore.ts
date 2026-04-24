import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import {
  createEmptyLearnerSchedulerState,
  applyReviewOutcomes,
} from '../domain/scheduler.js';
import type { LearnerSchedulerState, SchedulerReviewOutcomeInput } from '../types.js';

const learnerReviewRecordSchema = z.object({
  kanji: z.string(),
  status: z.union([z.literal('learning'), z.literal('review')]),
  successCount: z.number().int().nonnegative(),
  lapseCount: z.number().int().nonnegative(),
  intervalDays: z.number().int().nonnegative(),
  dueAt: z.string(),
  lastReviewedAt: z.string().optional(),
  lastGrade: z.union([z.literal('again'), z.literal('good')]).optional(),
});

const learnerSchedulerStateSchema = z.object({
  learnerId: z.string(),
  recordsByKanji: z.record(z.string(), learnerReviewRecordSchema),
  updatedAt: z.string(),
});

const schedulerDatabaseSchema = z.object({
  learners: z.record(z.string(), learnerSchedulerStateSchema),
});

type SchedulerDatabase = z.infer<typeof schedulerDatabaseSchema>;

export class FileSchedulerStore {
  constructor(private readonly filePath: string) {}

  async loadLearnerState(learnerId: string): Promise<LearnerSchedulerState> {
    const database = await this.readDatabase();
    return database.learners[learnerId] ?? createEmptyLearnerSchedulerState(learnerId);
  }

  async applyReviewOutcomes(
    learnerId: string,
    outcomes: readonly SchedulerReviewOutcomeInput[],
    updatedAt: string = new Date().toISOString(),
  ): Promise<LearnerSchedulerState> {
    const database = await this.readDatabase();
    const currentState = database.learners[learnerId] ?? createEmptyLearnerSchedulerState(learnerId, updatedAt);
    const nextState = applyReviewOutcomes(currentState, outcomes, updatedAt);

    await this.writeDatabase({
      learners: {
        ...database.learners,
        [learnerId]: nextState,
      },
    });

    return nextState;
  }

  private async readDatabase(): Promise<SchedulerDatabase> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return schedulerDatabaseSchema.parse(parsed);
    } catch (error) {
      if (isMissingFileError(error)) {
        return {
          learners: {},
        };
      }

      throw error;
    }
  }

  private async writeDatabase(database: SchedulerDatabase): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(database, null, 2), 'utf8');
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
