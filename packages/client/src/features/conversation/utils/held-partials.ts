import type { ConversationPartial } from '@repo/contracts';

/*
 * The call's status clears a partial as soon as its words are final, but the Feed commits the stored row
 * at most once a frame (ADR-0007), so for a moment neither is drawn and the row would leave and come back.
 * A cleared partial is held, its last words drawn on, until the Feed draws its row in its place.
 */
export interface HeldPartials {
  live: readonly ConversationPartial[];
  held: readonly ConversationPartial[];
}

export const noHeldPartials: HeldPartials = { live: [], held: [] };

const without = (
  partials: readonly ConversationPartial[],
  live: readonly ConversationPartial[],
): ConversationPartial[] =>
  partials.filter((partial) =>
    live.every((now) => now.rowId !== partial.rowId),
  );

// After the call's status changes: what it says now, and the partials it cleared.
export const holdPartials = (
  previous: HeldPartials,
  live: readonly ConversationPartial[],
): HeldPartials => ({
  live,
  held: without([...previous.held, ...previous.live], live),
});

// The partials to draw, in the order they were said.
export const drawnPartials = ({
  live,
  held,
}: HeldPartials): ConversationPartial[] => [...held, ...live];
