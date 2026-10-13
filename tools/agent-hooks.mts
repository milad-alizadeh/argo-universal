// Read docs/agents/hooks.md before changing this script or the hook configs that run it.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Agent worktrees made outside pnpm, such as Argo's Session worktrees, have no dependencies to check with.
if (existsSync(new URL('../node_modules/.bin', import.meta.url))) {
  const run = fileURLToPath(new URL('agent-hook-run.mts', import.meta.url));

  const hook = spawnSync(process.execPath, [run, ...process.argv.slice(2)], {
    stdio: 'inherit',
  });

  process.exit(hook.status ?? 1);
}
