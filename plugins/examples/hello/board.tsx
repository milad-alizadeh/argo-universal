import {
  applyListMove,
  List,
  ListItem,
  Screen,
  useState,
  type ListMove,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type Card = { id: string; title: string };

// A lane's cards are its rows, so the List's own move rule moves them.
type Lane = { id: string; title: string; rows: readonly Card[] };

const initial: Lane[] = [
  {
    id: 'todo',
    title: 'To do',
    rows: [
      { id: 'login', title: 'Fix login' },
      { id: 'docs', title: 'Write docs' },
    ],
  },
  {
    id: 'doing',
    title: 'Doing',
    rows: [{ id: 'search', title: 'Add search' }],
  },
  { id: 'done', title: 'Done', rows: [] },
];

// One lane: a Section whose cards are rows with ids, so each one moves.
const laneSection = (lane: Lane): JSX.Element => (
  <List.Section key={lane.id} id={lane.id} title={lane.title}>
    {lane.rows.map((card) => (
      <ListItem key={card.id} id={card.id} title={card.title} />
    ))}
  </List.Section>
);

const boardLook = {
  accessibilityLabel: 'Board',
  layout: 'lanes',
  appearance: 'cards',
} as const;

export function HelloBoard(): JSX.Element {
  const [lanes, setLanes] = useState(initial);
  // Argo reports where a card lands; the board moves it there and draws the new order.
  const onMove = (move: ListMove): void => setLanes(applyListMove(lanes, move));

  return (
    <Screen title="Hello board">
      <List {...boardLook} onMove={onMove}>
        {lanes.map(laneSection)}
      </List>
    </Screen>
  );
}
