// What the wide window's `/` shows: a Session id, or null for New Session.
export type FirstSessionChoice = string | null;

const isListed = (
  listedIds: readonly string[],
  chosen: FirstSessionChoice | undefined,
): chosen is string => typeof chosen === 'string' && listedIds.includes(chosen);

const firstListed = (listedIds: readonly string[]): FirstSessionChoice =>
  listedIds[0] ?? null;

// Keeps the open Session while it is listed and New Session once shown; otherwise the first listed Session.
export function chooseFirstSession(
  listedIds: readonly string[],
  chosen: FirstSessionChoice | undefined,
): FirstSessionChoice {
  if (chosen === null) return null;
  if (isListed(listedIds, chosen)) return chosen;
  return firstListed(listedIds);
}
