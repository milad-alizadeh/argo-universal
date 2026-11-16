import type { JiraAnswer } from './jira-client';
import type { OffsetPage } from './jira-readers';

type PageRead<Item> = (
  startAt: number,
) => Promise<JiraAnswer<OffsetPage<Item>>>;

// Enough pages for any site a person picks from; past it the list ends rather than read without end.
const mostPages = 20;

const finished = (next: number | null, left: number): next is null =>
  next === null || left <= 1;

async function collect<Item>(
  read: PageRead<Item>,
  from: { startAt: number; items: Item[]; left: number },
): Promise<JiraAnswer<Item[]>> {
  const answer = await read(from.startAt);

  if (!answer.ok) return answer;

  const { items, next } = answer.value;
  const all = [...from.items, ...items];

  return finished(next, from.left)
    ? { ok: true, value: all }
    : collect(read, { startAt: next, items: all, left: from.left - 1 });
}

// Every page of an offset-paged Jira list, such as the projects a person can see; a failed page fails the whole read.
export const allPages = <Item>(
  read: PageRead<Item>,
): Promise<JiraAnswer<Item[]>> =>
  collect(read, { startAt: 0, items: [], left: mostPages });
