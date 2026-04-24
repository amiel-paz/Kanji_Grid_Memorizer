import { resolve } from 'node:path';

export interface ServerConfig {
  readonly port: number;
  readonly allowedOrigin: string;
  readonly dataFilePath: string;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort(env.KANJI_GRID_SERVER_PORT),
    allowedOrigin: env.KANJI_GRID_SERVER_ORIGIN ?? 'http://localhost:5173',
    dataFilePath: resolve(env.KANJI_GRID_SERVER_DATA_PATH ?? 'server/data/learner-scheduler.json'),
  };
}

function parsePort(rawPort: string | undefined): number {
  const parsedPort = Number(rawPort ?? 8787);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error(`Invalid KANJI_GRID_SERVER_PORT: ${rawPort}`);
  }

  return parsedPort;
}
