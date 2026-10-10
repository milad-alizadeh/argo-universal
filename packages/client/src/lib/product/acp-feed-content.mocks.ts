import { recordedAcpContents } from '@repo/mocks/app';
import type { MockAgent } from './feed-message.mocks';

export function recordedAcpContent(
  agent: MockAgent,
): (typeof recordedAcpContents)[number] {
  const recording = recordedAcpContents.find(
    (recording) => recording.agent === agent,
  );
  if (!recording) throw new Error(`No ACP content recording for ${agent}`);
  return recording;
}
