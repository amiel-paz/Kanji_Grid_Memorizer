import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

interface RunnerOptions {
  readonly appHost: string;
  readonly appPort: number;
  readonly schedulerPort: number;
  readonly newLoadfile: boolean;
}

interface ChildHandle {
  readonly name: string;
  readonly process: ChildProcessWithoutNullStreams;
  readonly recentLogs: string[];
}

const rootDirectory = process.cwd();
const options = parseRunnerOptions(process.argv.slice(2));
const schedulerBaseUrl = `http://${options.appHost}:${options.schedulerPort}`;
const appBaseUrl = `http://${options.appHost}:${options.appPort}`;
const launchUrl = createLaunchUrl(appBaseUrl, options.newLoadfile);
const childHandles: ChildHandle[] = [];

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  await shutdown(1);
}

async function run(): Promise<void> {
  const schedulerProcess = startChild('scheduler', ['run', 'server:start'], {
    KANJI_GRID_SERVER_ORIGIN: appBaseUrl,
    KANJI_GRID_SERVER_PORT: String(options.schedulerPort),
  });
  childHandles.push(schedulerProcess);

  const appProcess = startChild('app', ['run', 'dev', '--', '--host', options.appHost, '--port', String(options.appPort), '--strictPort'], {
    VITE_REVIEW_SCHEDULER_BASE_URL: schedulerBaseUrl,
  });
  childHandles.push(appProcess);

  installShutdownHooks();

  await waitForHttp(`${schedulerBaseUrl}/api/health`, 20_000);
  await waitForHttp(appBaseUrl, 20_000);

  printRunnerBanner();
  await openUrl(launchUrl);

  await waitForUnexpectedExit();
}

function parseRunnerOptions(argv: readonly string[]): RunnerOptions {
  const newLoadfile = argv.includes('--new-loadfile');
  const appHost = process.env.KANJI_GRID_APP_HOST ?? '127.0.0.1';
  const appPort = parsePort(process.env.KANJI_GRID_APP_PORT, 5173, 'KANJI_GRID_APP_PORT');
  const schedulerPort = parsePort(
    process.env.KANJI_GRID_SERVER_PORT,
    8787,
    'KANJI_GRID_SERVER_PORT',
  );

  return {
    appHost,
    appPort,
    schedulerPort,
    newLoadfile,
  };
}

function parsePort(rawValue: string | undefined, fallback: number, label: string): number {
  const parsed = Number(rawValue ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${rawValue}`);
  }

  return parsed;
}

function createLaunchUrl(appUrl: string, newLoadfile: boolean): string {
  const launchUrl = new URL(appUrl);
  launchUrl.searchParams.set('loadfile', '1');

  if (newLoadfile) {
    launchUrl.searchParams.set('createLoadfile', '1');
  }

  return launchUrl.toString();
}

function startChild(
  name: string,
  args: readonly string[],
  extraEnv: NodeJS.ProcessEnv,
): ChildHandle {
  const child = spawn(getNpmCommand(), args, {
    cwd: rootDirectory,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const recentLogs: string[] = [];

  child.stdout.on('data', (chunk) => {
    pushRecentLog(recentLogs, chunk);
  });
  child.stderr.on('data', (chunk) => {
    pushRecentLog(recentLogs, chunk);
  });

  child.once('exit', (code, signal) => {
    if (!isShuttingDown) {
      console.error(`\n${name} exited unexpectedly (${signal ?? code ?? 'unknown'}).`);
      const logOutput = recentLogs.join('').trim();

      if (logOutput) {
        console.error(logOutput);
      }

      void shutdown(1);
    }
  });

  return {
    name,
    process: child,
    recentLogs,
  };
}

function pushRecentLog(logs: string[], chunk: string | Buffer): void {
  logs.push(chunk.toString());

  while (logs.join('').length > 6_000) {
    logs.shift();
  }
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }

      lastError = new Error(`Received ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    `Timed out waiting for ${url}${lastError instanceof Error ? `: ${lastError.message}` : ''}`,
  );
}

async function openUrl(url: string): Promise<void> {
  const { command, args } = getOpenCommand(url);
  const child = spawn(command, args, {
    cwd: rootDirectory,
    stdio: 'ignore',
    detached: true,
  });

  child.unref();
}

function getOpenCommand(url: string): { command: string; args: string[] } {
  if (process.platform === 'darwin') {
    return { command: 'open', args: [url] };
  }

  if (process.platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] };
  }

  return { command: 'xdg-open', args: [url] };
}

function printRunnerBanner(): void {
  console.log('');
  console.log('KANJI GRID LOADFILE');
  console.log(`scheduler  ${schedulerBaseUrl}`);
  console.log(`app        ${appBaseUrl}`);
  console.log(`mode       ${options.newLoadfile ? 'create new loadfile' : 'loadfile picker'}`);
  console.log(`launch     ${launchUrl}`);
  console.log('press      Ctrl+C to stop the local study environment');
}

async function waitForUnexpectedExit(): Promise<void> {
  await new Promise<void>((resolve) => {
    const cleanup = () => resolve();

    for (const childHandle of childHandles) {
      childHandle.process.once('exit', cleanup);
    }
  });
}

let isShuttingDown = false;

function installShutdownHooks(): void {
  process.once('SIGINT', () => {
    void shutdown(0);
  });
  process.once('SIGTERM', () => {
    void shutdown(0);
  });
}

async function shutdown(exitCode: number): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  await Promise.all(
    childHandles.map(async ({ process: child }) => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill('SIGTERM');
      await onceExit(child, 5_000);
    }),
  );

  process.exit(exitCode);
}

async function onceExit(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
    }),
    delay(timeoutMs).then(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }),
  ]);
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}
