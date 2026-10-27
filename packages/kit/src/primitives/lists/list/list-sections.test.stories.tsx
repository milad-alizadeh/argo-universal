import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Sections',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const UntitledShelves: Story = {
  render: () => (
    <List direction="horizontal">
      <ListItem title="Before" />
      <List.Section>
        <ListItem title="First section" />
      </List.Section>
      <List.Section>
        <ListItem title="Second section" />
      </List.Section>
      <ListItem title="After" />
    </List>
  ),
  play: async ({ canvas }) => {
    await canvas.findByText('After');
    await expect(
      canvas.getAllByRole('button', { name: 'Next items' }),
    ).toHaveLength(4);
  },
};

function IndirectSection({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}

type RenderingPath = 'direct' | 'indirect' | 'standalone';

function SectionRules({ path }: { path: RenderingPath }): React.JSX.Element {
  const [selection, setSelection] = useState<readonly string[]>([]);
  const [expanded, setExpanded] = useState(true);

  const section = (
    <List.Section
      title="Choices"
      footer="Section guidance"
      selectionMode="multiple"
      selection={selection}
      onSelectionChange={setSelection}
      isExpanded={expanded}
      onExpandedChange={setExpanded}
    >
      <ListItem id="choice" title="Choice" />
    </List.Section>
  );

  return (
    <>
      <Text>{`${selection.length} selected`}</Text>
      <SectionPath path={path}>{section}</SectionPath>
    </>
  );
}

function SectionPath({
  path,
  children,
}: {
  path: RenderingPath;
  children: React.ReactNode;
}): React.ReactNode {
  if (path === 'standalone') return children;

  return (
    <List>
      {path === 'indirect' ? (
        <IndirectSection>{children}</IndirectSection>
      ) : (
        children
      )}
    </List>
  );
}

function sectionRules(path: RenderingPath): Story {
  return {
    render: () => <SectionRules path={path} />,
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Choice' }),
      );
      await expect(canvas.getByText('1 selected')).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Choices' }));
      await expect(canvas.queryByRole('button', { name: 'Choice' })).toBeNull();
      await expect(canvas.getByText('Section guidance')).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Choices' }));
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Choice' }),
      );
      await expect(canvas.getByText('0 selected')).toBeVisible();
    },
  };
}

export const DirectRules = sectionRules('direct');

export const IndirectRules = sectionRules('indirect');

export const StandaloneRules = sectionRules('standalone');

function RememberedItem({ name }: { name: string }): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <ListItem title={`${name} ${count}`} onPress={() => setCount(count + 1)} />
  );
}

function ReorderedSections(): React.JSX.Element {
  const [names, setNames] = useState(['First', 'Second']);

  return (
    <>
      <ListItem
        title="Reverse"
        onPress={() => setNames([...names].reverse())}
      />
      <List direction="horizontal">
        {names.map((name) => (
          <List.Section key={name}>
            <RememberedItem name={name} />
          </List.Section>
        ))}
      </List>
    </>
  );
}

export const KeyedSectionsKeepState: Story = {
  render: () => <ReorderedSections />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'First 0' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Reverse' }));
    await userEvent.click(
      await canvas.findByRole('button', { name: 'First 1' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'First 2' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Second 0' }),
    ).toBeVisible();
  },
};
