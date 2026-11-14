import type { AnyRequest } from '@agentclientprotocol/sdk';
import type { SessionSnapshot } from '@repo/contracts';
import { expect } from 'vitest';
import type { ScriptedProcess } from '#mocks/scripted-agent';

const text = 'Run the regression tests';

const vendorSessionId = 'suggestion-session';

export async function requestFor(
  process: ScriptedProcess,
  method: string,
): Promise<AnyRequest> {
  for (;;) {
    const message = await process.readRequest();

    if (message.method === method) return message;
  }
}

export function publish(
  process: ScriptedProcess,
  promptId: string,
  title: string,
): Promise<void> {
  return process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'session_info_update',
          title,
          _meta: {
            promptSuggestions: {
              version: 1,
              promptId,
              suggestions: [{ text }],
            },
          },
        },
      },
    ],
    vendorSessionId,
  );
}

export function candidateTurn(snapshot: SessionSnapshot): string {
  const turnId = snapshot.followUpSuggestion?.turnId;

  if (!turnId) throw new Error('Expected an opted-in Turn candidate');

  return turnId;
}

export function isPrediction(snapshot: SessionSnapshot): boolean {
  return snapshot.title === 'Predicted' && predictedText(snapshot) === text;
}

function predictedText(snapshot: SessionSnapshot): string | null | undefined {
  return snapshot.followUpSuggestion?.text;
}

export function assertSharedPredictions(
  snapshots: SessionSnapshot[],
  turnId: string,
): void {
  for (const snapshot of snapshots)
    expect(snapshot.followUpSuggestion).toEqual({ turnId, text });
}
