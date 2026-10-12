import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createGenerator } from 'ts-json-schema-generator';

const commit = '68d7d2d5ddfc0ed5746f9f6130892dda685e65dd';
const url = `https://raw.githubusercontent.com/agentclientprotocol/codex-acp/${commit}/src/AuthStatusMeta.ts`;
const source = await (await fetch(url)).text();
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== 'b316a29a6db8608ff3cd7740f165297649c3c75a16b9da86a7599817e3e4f0c4')
  throw new Error('Pinned upstream auth source changed');
const start = source.indexOf('export type AuthStatusKind =');
const end = source.indexOf('/**\n * Capability advertised');
if (start < 0 || end <= start)
  throw new Error('Upstream auth declarations changed');
const declarations = source
  .slice(start, end)
  .replaceAll(/\/\*\*[\s\S]*?\*\//g, '');
const output = new URL(
  '../src/agents/upstream/auth-status.gen.ts',
  import.meta.url,
);
writeFileSync(
  output,
  `// Generated from codex-acp ${commit}/src/AuthStatusMeta.ts; SHA256 ${hash}.\n// Run node packages/contracts/tools/generate-auth-status.ts.\n\n${declarations.trim()}\n`,
);
const generator = createGenerator({
  path: output.pathname,
  type: 'AuthStatusUpdateNotification',
  additionalProperties: true,
  jsDoc: 'none',
  skipTypeCheck: true,
});
writeFileSync(
  new URL(
    '../src/agents/upstream/auth-status-schema.gen.json',
    import.meta.url,
  ),
  `${JSON.stringify(generator.createSchema('AuthStatusUpdateNotification'), null, 2)}\n`,
);
