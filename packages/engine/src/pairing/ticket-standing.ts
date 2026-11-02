import type { OfferedTicket } from '@repo/contracts/pake';

interface Standing extends OfferedTicket {
  readonly expiresAt: number;
}

const rank = { live: 0, spent: 1, expired: 2 };

const liveStanding = (live: Map<string, number>, now: number): Standing[] =>
  [...live].map(([code, expiresAt]) => ({
    code,
    expiresAt,
    status: expiresAt > now ? 'live' : 'expired',
  }));

const spentStanding = (spent: Map<string, number>, now: number): Standing[] =>
  [...spent].flatMap(([code, expiresAt]) =>
    expiresAt > now ? [{ code, expiresAt, status: 'spent' as const }] : [],
  );

const byRelevance = (a: Standing, b: Standing): number =>
  rank[a.status] - rank[b.status] || b.expiresAt - a.expiresAt;

// Live Tickets first, then spent, then those that ran out of time, each newest first, so the few a reply can cover are the ones most likely to be meant.
export const offeredTickets = (
  live: Map<string, number>,
  spent: Map<string, number>,
  now: number,
): OfferedTicket[] =>
  [...liveStanding(live, now), ...spentStanding(spent, now)]
    .sort(byRelevance)
    .map(({ code, status }) => ({ code, status }));
