import type { VoicePartial } from '@repo/contracts';

/*
 * The call's status clears a partial as soon as its words are final, but the Feed commits the stored row
 * at most once a frame (ADR-0007), so for a moment neither is drawn and the row would leave and come back.
 * A cleared partial is held, its last words drawn on, until the Feed draws its row in its place.
 */
export interface HeldPartials {
  live: readonly VoicePartial[];
  held: readonly VoicePartial[];
}

export const noHeldPartials: HeldPartials = { live: [], held: [] };

const without = (
  partials: readonly VoicePartial[],
  live: readonly VoicePartial[],
): VoicePartial[] =>
  partials.filter((partial) =>
    live.every((now) => now.rowId !== partial.rowId),
  );

// After the call's status changes: what it says now, and the partials it cleared.
export const holdPartials = (
  previous: HeldPartials,
  live: readonly VoicePartial[],
): HeldPartials => ({
  live,
  held: without([...previous.held, ...previous.live], live),
});

// The partials to draw, in the order they were said.
export const drawnPartials = ({ live, held }: HeldPartials): VoicePartial[] => [
  ...held,
  ...live,
];
