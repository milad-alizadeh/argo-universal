import { List, ListItem, Screen, useState } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

// Where Argo reports a moved card lands.
type Move = { id: string; section?: string; index: number };

type Card = { id: string; title: string };

type Lane = { id: string; title: string; cards: Card[] };

const initial: Lane[] = [
  {
    id: 'todo',
    title: 'To do',
    cards: [
      { id: 'login', title: 'Fix login' },
      { id: 'docs', title: 'Write docs' },
    ],
  },
  {
    id: 'doing',
    title: 'Doing',
    cards: [{ id: 'search', title: 'Add search' }],
  },
  { id: 'done', title: 'Done', cards: [] },
];

// Argo reports where a card lands; the board moves it there and draws the new order.
const moved = (lanes: Lane[], { id, section, index }: Move): Lane[] => {
  const card = lanes.flatMap((lane) => lane.cards).find((c) => c.id === id);

  if (!card) return lanes;

  return lanes.map((lane) => {
    const cards = lane.cards.filter((c) => c.id !== id);

    if (lane.id === section) cards.splice(index, 0, card);

    return { ...lane, cards };
  });
};

// One lane: a Section whose cards are rows with ids, so each one moves.
const laneSection = (lane: Lane): JSX.Element => (
  <List.Section key={lane.id} id={lane.id} title={lane.title}>
    {lane.cards.map((card) => (
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
  const onMove = (move: Move): void => setLanes(moved(lanes, move));

  return (
    <Screen title="Hello board">
      <List {...boardLook} onMove={onMove}>
        {lanes.map(laneSection)}
      </List>
    </Screen>
  );
}
