import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = process.env.OPERATIONAL_HOST ?? '127.0.0.1';
const port = process.env.OPERATIONAL_PORT ?? '4173';
const baseUrl = `http://${host}:${port}`;
const startupTimeoutMs = Number.parseInt(process.env.OPERATIONAL_TIMEOUT_MS ?? '30000', 10);

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${label} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = new Error('Operational check did not start.');

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }

      lastError = new Error(`Expected 2xx from ${url}, received ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    await delay(500);
  }

  throw lastError;
}

function waitForExit(child, label) {
  return new Promise((resolve, reject) => {
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${label} exited from signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${label} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

await run('bun', ['run', 'build'], 'bun run build');

const preview = spawn('bun', ['run', 'preview', '--', '--host', host, '--port', port], {
  stdio: 'inherit',
  env: process.env,
});
const previewExit = waitForExit(preview, 'bun run preview');

try {
  const rootResponse = await Promise.race([
    waitForHttp(`${baseUrl}/`, startupTimeoutMs),
    previewExit,
  ]);
  const rootHtml = await rootResponse.text();

  if (!rootHtml.includes('<title>Personal Health Cockpit')) {
    throw new Error('Root document loaded, but the expected title was not present.');
  }

  const statusResponse = await Promise.race([
    waitForHttp(`${baseUrl}/api/status`, 5000),
    previewExit,
  ]);
  const statusPayload = await statusResponse.json();

  if (statusPayload?.ok !== true || statusPayload?.service !== 'personal-health-cockpit') {
    throw new Error(`Unexpected status payload: ${JSON.stringify(statusPayload)}`);
  }

  console.log(`Operational check passed at ${baseUrl}`);
} finally {
  if (!preview.killed) {
    preview.kill('SIGINT');
  }
  await Promise.race([previewExit.catch(() => undefined), delay(2000)]);
}
