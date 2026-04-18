import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('package script invariants', () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };

  it('routes coverage through explicit unit and component configs', () => {
    expect(pkg.scripts['test:coverage:unit']).toBe(
      'node ./scripts/run-vitest.mjs --config vitest.unit.config.ts --coverage'
    );
    expect(pkg.scripts['test:coverage:component']).toBe(
      'node ./scripts/run-vitest.mjs --config vitest.component.config.ts --coverage'
    );
    expect(pkg.scripts['test:coverage']).toBe(
      'bun run test:coverage:unit && bun run test:coverage:component'
    );
  });
});
