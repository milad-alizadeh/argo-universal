/*
 * How long a Session's last activity holds still while its Feed changes.
 * Every streamed chunk is a change, and a row that differs on every chunk makes every list subscriber read and redraw it.
 * The list shows an age in minutes, so a step this short moves nothing a person can see.
 */
export const activityStep = 30_000;

export function steppedActivityAt(previous: number, now: number): number {
  return now - previous >= activityStep ? now : previous;
}
