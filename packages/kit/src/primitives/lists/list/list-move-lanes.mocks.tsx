import type { ReactElement } from 'react';
import { ListItem } from '../list-item';
import { List } from './list';
import type { ListMove } from './list-move-model';
import { board } from './list-moves-fixtures';

interface LanesExampleProps {
  // Called with each move; these owners keep their order, so a row lands only in the report.
  onMove: (move: ListMove) => void;
}

// Rows open something when pressed, as a board's cards do.
const open = (): void => {};

// A plain function, not a component: the List reads its rows from its own children.
const row = (title: string): ReactElement => (
  <ListItem key={title} id={title.toLowerCase()} title={title} onPress={open} />
);

// Rows outside any Section, To do, and Notes, a Section without an id: its rows stay put, and nothing lands in it.
export function SectionWithoutIdExample({
  onMove,
}: LanesExampleProps): ReactElement {
  return (
    <List {...board} onMove={onMove}>
      {row('Stray')}
      <List.Section id="todo" title="To do">
        {row('Login')}
      </List.Section>
      <List.Section title="Notes">{row('Note')}</List.Section>
    </List>
  );
}

// Rows outside any Section on both sides of one: they are one lane.
export function LooseAroundSectionExample({
  onMove,
}: LanesExampleProps): ReactElement {
  return (
    <List {...board} onMove={onMove}>
      {row('Alpha')}
      <List.Section id="todo" title="To do">
        {row('Login')}
      </List.Section>
      {row('Omega')}
    </List>
  );
}

// A board without Sections draws one column, and its rows still move.
export function LooseOnlyExample({ onMove }: LanesExampleProps): ReactElement {
  return (
    <List {...board} onMove={onMove}>
      {row('Alpha')}
      {row('Beta')}
      {row('Gamma')}
    </List>
  );
}
