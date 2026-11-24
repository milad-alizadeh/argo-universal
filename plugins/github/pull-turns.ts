type Turn = PromiseSettledResult<boolean>;

type TurnOf<Item> = (item: Item) => Promise<boolean>;

type OfSession = { sessionId: string };

// One Session's pull requests take their turns in order, so two never Prompt it in the same tick.
async function inOrder<Item>(
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<Turn[]> {
  const turns: Turn[] = [];

  for (const item of items)
    turns.push(...(await Promise.allSettled([turnOf(item)])));

  return turns;
}

// Each Session's turns are one group; the groups run at once, so one slow read of GitHub never holds the others back.
async function inTurn<Item extends OfSession>(
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<Turn[]> {
  const groups = Map.groupBy(items, ({ sessionId }) => sessionId);

  return (
    await Promise.all(
      [...groups.values()].map((group) => inOrder(group, turnOf)),
    )
  ).flat();
}

const acted = (turn: Turn): boolean =>
  turn.status === 'fulfilled' && turn.value;

const isFailure = (turn: Turn): turn is PromiseRejectedResult =>
  turn.status === 'rejected';

async function runTurns<Item extends OfSession>(
  argo: { changed: () => void },
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<void> {
  argo.changed();

  const turns = await inTurn(items, turnOf);

  if (turns.some(acted)) argo.changed();

  const failed = turns.find(isFailure);

  if (failed) throw failed.reason;
}

/*
 * A Watch step over the pull requests that have an automation on: each Session takes its turn at once (its own pull requests in order), and the turn says whether it
 * acted. The Plugin's reads are made due first, and the lists redraw when any turn acted. The first failure is thrown
 * after all have had their turn.
 */
export async function takeTurns<Item extends OfSession>(
  argo: { changed: () => void },
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<void> {
  if (items.length > 0) await runTurns(argo, items, turnOf);
}
