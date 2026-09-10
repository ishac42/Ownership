const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const src = path.join(repoRoot, 'my-app', 'dist');
const dest = path.join(repoRoot, 'ownership-ui-test');

if (!fs.existsSync(src)) {
  console.error(`Build output not found: ${src}`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied UI build to ${dest}`);
