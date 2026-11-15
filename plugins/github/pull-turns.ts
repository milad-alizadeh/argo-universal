type Turn = PromiseSettledResult<boolean>;

type TurnOf<Item> = (item: Item) => Promise<boolean>;

// Each pull request takes its turn in order; one failing does not stop the others.
async function inTurn<Item>(
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<Turn[]> {
  const turns: Turn[] = [];

  for (const item of items)
    turns.push(...(await Promise.allSettled([turnOf(item)])));

  return turns;
}

const acted = (turn: Turn): boolean =>
  turn.status === 'fulfilled' && turn.value;

const isFailure = (turn: Turn): turn is PromiseRejectedResult =>
  turn.status === 'rejected';

async function runTurns<Item>(
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
 * A Watch step over the pull requests that have an automation on: each takes its turn, and the turn says whether it
 * acted. The Plugin's reads are made due first, and the lists redraw when any turn acted. The first failure is thrown
 * after all have had their turn.
 */
export async function takeTurns<Item>(
  argo: { changed: () => void },
  items: readonly Item[],
  turnOf: TurnOf<Item>,
): Promise<void> {
  if (items.length > 0) await runTurns(argo, items, turnOf);
}
