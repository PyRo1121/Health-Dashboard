import { spawn } from 'node:child_process';

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit'
		});

		child.on('exit', (code, signal) => {
			if (signal) {
				reject(new Error(`${command} exited from signal ${signal}`));
				return;
			}

			if (code !== 0) {
				reject(new Error(`${command} exited with code ${code}`));
				return;
			}

			resolve();
		});
	});
}

await run(process.execPath, ['./scripts/run-vitest.mjs', '--config', 'vitest.unit.config.ts']);
await run(process.execPath, ['./scripts/run-vitest.mjs', '--config', 'vitest.component.config.ts']);
await run('./node_modules/.bin/playwright', ['test']);
