import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Writes the transcript a resumed Session needs under `directory`, and returns the environment that points the SDK at it.
export function writeClaudeTranscript(
  directory: string,
  cwd: string,
  sessionId: string,
) {
  const projectDirectory = path.join(
    directory,
    'projects',
    cwd.replace(/[^a-zA-Z0-9]/g, '-'),
  );
  mkdirSync(projectDirectory, { recursive: true });
  writeFileSync(
    path.join(projectDirectory, `${sessionId}.jsonl`),
    `${JSON.stringify({
      type: 'user',
      message: { role: 'user', content: 'Earlier prompt' },
      uuid: 'earlier-prompt',
      sessionId,
      cwd,
      timestamp: '2026-10-05T00:00:00.000Z',
    })}\n`,
  );
  return { environment: { CLAUDE_CONFIG_DIR: directory }, scenario: {} };
}
