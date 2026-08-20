/* Loads directory-data.js the same way a browser does — by evaluating it
   against a stand-in `window` — so the checks in this folder read exactly
   what the site reads. No dependencies, no build step. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadDirectory(file = join(repoRoot, 'directory-data.js')) {
  const source = readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: file });
  const { window } = sandbox;
  if (!window.IRVING_DIRECTORY) {
    throw new Error(`${file} did not assign window.IRVING_DIRECTORY`);
  }
  return window.IRVING_DIRECTORY;
}

/* Tiny shared reporter: collect problems, print them grouped, exit non-zero. */
export function createReport(title) {
  const errors = [];
  const warnings = [];
  return {
    error: (where, message) => errors.push({ where, message }),
    warn: (where, message) => warnings.push({ where, message }),
    finish(okMessage) {
      for (const { where, message } of warnings) {
        console.log(`warning  ${where}: ${message}`);
      }
      for (const { where, message } of errors) {
        console.log(`error    ${where}: ${message}`);
      }
      if (errors.length) {
        console.log(`\n${title}: ${errors.length} error(s), ${warnings.length} warning(s).`);
        process.exit(1);
      }
      console.log(`${okMessage}${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
    },
  };
}
