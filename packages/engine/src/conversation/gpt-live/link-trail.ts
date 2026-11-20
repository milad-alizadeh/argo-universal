import { z } from 'zod';
import { usageReport } from './link-limit';
import { frameRejections, readFrame } from './read-frame';

/*
 * What the control link says about how the call goes, for the Server's log: the close and error frames as sent, and the
 * allowance whenever its standing changes. These frames carry no audio and no token; audio frames are never parsed here.
 */

type UsageLimit = { status: string | null };

// What the trail remembers across frames.
interface TrailState {
  expiresAt: number | undefined;
  limitStatus: string | null;
}

// What one frame does to the trail: the notes it adds.
type Reading = (state: TrailState) => string[];

const started =
  ({ session }: { session: { expires_at: number } }): Reading =>
  (state) => {
    state.expiresAt = session.expires_at;

    return [];
  };

// Each change in the allowance's standing is noted once.
const usageLimit =
  ({ usage_limit: limit }: { usage_limit: UsageLimit }): Reading =>
  (state) => {
    if (limit.status === state.limitStatus) return [];
    state.limitStatus = limit.status;

    return [`usage limit ${JSON.stringify(limit)}`];
  };

const asSent =
  ({ type, ...rest }: { type: string }): Reading =>
  () => [`${type} ${JSON.stringify(rest)}`];

const readings = z.union([
  z
    .looseObject({
      type: z.literal('session.started'),
      session: z.looseObject({ expires_at: z.number() }),
    })
    .transform(started),
  usageReport.transform(usageLimit),
  z
    .looseObject({ type: z.enum(['session.closed', 'error']) })
    .transform(asSent),
]);

// The type leads every frame the service sends, so a glance at the start tells a frame worth reading from an audio one.
const leadingType =
  /^\{"type":"(session\.started|session\.closed|error|session\.usage\.updated)"/;

const rejectFrame = frameRejections('GPT-Live control link trail');

const readingOf = (frame: string): Reading | null =>
  leadingType.test(frame) ? readFrame(readings, frame, rejectFrame) : null;

// How far before `expires_at` a close still counts as the call reaching its longest.
const onTimeSlackSeconds = 5;

const secondMs = 1000;

export class LinkTrail {
  private readonly state: TrailState = {
    expiresAt: undefined,
    limitStatus: null,
  };

  // The notes one text frame adds; most frames add none.
  public read(frame: string): string[] {
    return readingOf(frame)?.(this.state) ?? [];
  }

  // Whether the call has reached the expiry its start gave it.
  public expired(now: number): boolean {
    const { expiresAt } = this.state;

    return (
      expiresAt !== undefined &&
      now / secondMs >= expiresAt - onTimeSlackSeconds
    );
  }
}
