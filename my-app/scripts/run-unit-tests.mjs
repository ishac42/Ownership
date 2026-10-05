// Node 20 cannot execute TypeScript directly. Transpile the unit tests with the
// TypeScript already installed, then run them with node:test.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'src/utils/displayText.ts',
  'src/utils/displayText.test.ts',
  'src/utils/ownerPayload.ts',
  'src/utils/ownershipStatus.ts',
  'src/utils/ownershipStatus.test.ts',
];

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownership-tests-'));

for (const rel of files) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: rel,
  });
  const code = transpiled.outputText.replace(
    /from\s+['"](\.[^'"]+)['"]/g,
    (_match, spec) => `from '${spec.replace(/\.ts$/, '')}.js'`
  );
  const dest = path.join(outDir, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, code);
}

const result = spawnSync(
  process.execPath,
  [
    '--test',
    path.join(outDir, 'src/utils/ownershipStatus.test.js'),
    path.join(outDir, 'src/utils/displayText.test.js'),
  ],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
