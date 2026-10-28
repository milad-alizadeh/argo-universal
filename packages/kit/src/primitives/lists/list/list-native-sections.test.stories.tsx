import { applyListMove } from '@repo/contracts/kit-moves';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { expect } from 'storybook/test';
import { List } from './list';
import type { MoveSection } from './list-move-model';
import { moveSection } from './list-move-sections.mocks';
import {
  shownNativeSections,
  type NativeSection,
} from './list-native-sections';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/NativeSections',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const Row = (props: { id?: string; title: string }): ReactElement => (
  <Text>{props.title}</Text>
);

// An App's rows keyed by their index, as a map writes them, so the same keys repeat in each Section.
const children = [
  <List.Section key="first" id="first" title="First">
    {[
      <Row key={0} id="alpha" title="Alpha" />,
      <Row key={1} id="beta" title="Beta" />,
    ]}
  </List.Section>,
  <List.Section key="second" id="second" title="Second">
    {[<Row key={0} id="gamma" title="Gamma" />, <Row key={1} title="Note" />]}
  </List.Section>,
];

const owners: MoveSection[] = [
  moveSection({ key: 'first', id: 'first', rows: ['alpha', 'beta'] }),
  moveSection({ key: 'second', id: 'second', rows: ['gamma'] }),
];

const keysOf = (sections: NativeSection[]): string[] =>
  sections.flatMap((section) => section.rows.map((row) => row.key));

const shown = (): NativeSection[] =>
  shownNativeSections(
    children,
    applyListMove(owners, { id: 'alpha', section: 'second', index: 0 }),
  );

export const MovedRowKeepsAKeyOfItsOwn: Story = {
  render: () => <Text>{keysOf(shown()).join(', ')}</Text>,
  play: async () => {
    const keys = keysOf(shown());

    await expect(new Set(keys).size).toBe(keys.length);
  },
};

export const RowsKeyByTheirIds: Story = {
  render: () => <Text>{keysOf(shown()).join(', ')}</Text>,
  play: async () => {
    await expect(keysOf(shown())).toContain('row/alpha');
  },
};

const repeated = [
  <List.Section key="first" id="first" title="First">
    {[
      <Row key={0} id="alpha" title="Alpha" />,
      <Row key={1} id="alpha" title="Copy" />,
    ]}
  </List.Section>,
];

export const RepeatedIdKeepsItsPlaceKey: Story = {
  render: () => <Text>repeated</Text>,
  play: async () => {
    const keys = keysOf(
      shownNativeSections(repeated, [
        moveSection({ key: 'first', id: 'first', rows: ['alpha'] }),
      ]),
    );

    await expect(new Set(keys).size).toBe(keys.length);
  },
};
