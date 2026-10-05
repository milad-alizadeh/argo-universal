import { writeFileSync } from 'node:fs';
import path from 'node:path';

// The mock app-server checks this stored identity when a Session resumes.
export function writeCodexTranscript(
  directory: string,
  _cwd: string,
  vendorSessionId: string,
) {
  const file = path.join(directory, 'transcript.json');
  writeFileSync(file, JSON.stringify({ vendorSessionId }));
  return { MOCK_CLI_TRANSCRIPT: file };
}
