import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from './sheet';
import {
  fitsItsContentSheet,
  fullHeightSheet,
  settingsSheet,
  pinnedSubmitSheet,
  type SheetFixture,
} from './sheet-fixtures';
import { useSheet } from './sheet-pages';

const meta = {
  title: 'Design System/Primitives/Overlays/Sheet',
  component: Sheet,
  /*
   * A sheet opens from its own trigger and holds its own open state, so each story draws an example
   * of its own and these args only satisfy the component's type.
   */
  args: { open: false, onOpenChange: (): void => {} },
  argTypes: kitArgTypes('Sheet'),
  // PagedSheet is the example `sheet.test.stories.tsx` drives, not a story.
  excludeStories: ['PagedSheet'],
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FitsItsContent: Story = {
  render: () => <ExampleSheet {...fitsItsContentSheet} />,
};

// Submit sits below the choices, pinned while they scroll.
export const PinnedSubmit: Story = {
  render: () => <ExampleSheet {...pinnedSubmitSheet} />,
};

export const FullHeight: Story = {
  render: () => <ExampleSheet {...fullHeightSheet} />,
};

// Settings drills in to Select Fruit and back, the pages sliding in one sheet.
export const PageStack: Story = { render: () => <PagedSheet /> };

const choices = ['Option one', 'Option two', 'Option three'];

function ExampleSheet(props: SheetFixture): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      {...props}
      open={open}
      onOpenChange={setOpen}
      trigger={<MenuTrigger label={props.label} />}
    >
      <Choices />
    </Sheet>
  );
}

function Choices(): ReactElement {
  return (
    <View className="gap-3 p-4">
      {choices.map((choice) => (
        <Text key={choice}>{choice}</Text>
      ))}
    </View>
  );
}

const fruits = ['Apple', 'Banana', 'Cherry'];

export function PagedSheet(): ReactElement {
  const [open, setOpen] = useState(false);
  const [fruit, setFruit] = useState(fruits[0]);

  return (
    <Sheet open={open} onOpenChange={setOpen} {...settingsSheet}>
      {fruitPages(fruit, setFruit)}
    </Sheet>
  );
}

function fruitPages(
  fruit: string | undefined,
  onSelect: (fruit: string) => void,
): ReactElement[] {
  return [
    <Sheet.Page key="settings" name="settings" title="Settings">
      <SingleSection>
        <Sheet.Link to="fruit" label="Fruit" value={fruit} />
      </SingleSection>
    </Sheet.Page>,
    <Sheet.Page key="fruit" name="fruit" title="Select Fruit">
      <FruitChoices onSelect={onSelect} />
    </Sheet.Page>,
  ];
}

function SingleSection(props: { children: ReactNode }): ReactElement {
  return (
    <List appearance="plain" fit>
      <ListSection>{props.children}</ListSection>
    </List>
  );
}

function FruitChoices(props: {
  onSelect: (fruit: string) => void;
}): ReactElement {
  return (
    <SingleSection>
      {fruits.map((fruit) => (
        <FruitRow key={fruit} fruit={fruit} onSelect={props.onSelect} />
      ))}
    </SingleSection>
  );
}

interface FruitRowProps {
  fruit: string;
  onSelect: (fruit: string) => void;
}

function FruitRow(props: FruitRowProps): ReactElement {
  const sheet = useSheet();

  return (
    <ListItem
      title={props.fruit}
      accessibilityRole="button"
      onPress={() => {
        props.onSelect(props.fruit);
        sheet.back();
      }}
    />
  );
}
