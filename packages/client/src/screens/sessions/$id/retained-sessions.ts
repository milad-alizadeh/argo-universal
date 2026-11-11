const retainedSessionCount = 3;

// The Sessions whose pages stay mounted: the shown one first, then the ones shown most recently before it.
export function retainSession(recent: string[], sessionId: string): string[] {
  if (recent[0] === sessionId) return recent;

  return [sessionId, ...recent.filter((id) => id !== sessionId)].slice(
    0,
    retainedSessionCount,
  );
}

/*
 * The kept pages in the order they are drawn: by id, never by recency. A switch then only adds or
 * removes a page. Drawn most recent first, the page just left moved in the document, and a browser
 * resets every scroller inside a moved node, so its Feed came back at the top (#1982).
 */
export const sessionsInDrawOrder = (recent: string[]): string[] =>
  [...recent].sort((first, second) => (first < second ? -1 : 1));
