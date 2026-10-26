import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from './sheet';
import {
  fitsItsContentSheet,
  fullHeightSheet,
  settingsSheet,
  pinnedSubmitSheet,
  type SheetFixture,
} from './sheet-fixtures';
import { useSheet } from './sheet-screens';

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

// A page of FieldGroup sections draws as a Settings page does, and Submit sits below it, pinned while the rows scroll.
export const PinnedSubmit: Story = {
  render: () => <ExampleSheet {...pinnedSubmitSheet} />,
};

export const FullHeight: Story = {
  render: () => <ExampleSheet {...fullHeightSheet} />,
};

// Settings drills in to Select Fruit and back, the pages sliding in one sheet.
export const ScreenStack: Story = { render: () => <PagedSheet /> };

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
      {props.contentScrolls ? <ChoicesGroup /> : <Choices />}
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

// The sheet holds the FieldGroup as a Screen does: its sections, titles and cards are the FieldGroup's own.
function ChoicesGroup(): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.Section title="Options" footer="Each option is its own row.">
        {choices.map((choice) => (
          <ChoiceToggle key={choice} title={choice} />
        ))}
      </FieldGroup.Section>
      <FieldGroup.Section title="About">
        <FieldGroup.Value title="Version" value="1.2.3" />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function ChoiceToggle(props: { title: string }): ReactElement {
  const [on, setOn] = useState(false);

  return (
    <FieldGroup.Toggle title={props.title} value={on} onValueChange={setOn} />
  );
}

const fruits = ['Apple', 'Banana', 'Cherry'];

export function PagedSheet(): ReactElement {
  const [open, setOpen] = useState(false);
  const [fruit, setFruit] = useState('Apple');

  return (
    <Sheet open={open} onOpenChange={setOpen} {...settingsSheet}>
      {fruitScreens(fruit, setFruit)}
    </Sheet>
  );
}

function fruitScreens(
  fruit: string,
  onSelect: (fruit: string) => void,
): ReactElement[] {
  return [
    <Sheet.Screen key="settings" name="settings" title="Settings">
      <SettingsPage fruit={fruit} />
    </Sheet.Screen>,
    <Sheet.Screen key="fruit" name="fruit" title="Select Fruit">
      <FruitPage fruit={fruit} onSelect={onSelect} />
    </Sheet.Screen>,
  ];
}

function SettingsPage(props: { fruit: string }): ReactElement {
  const sheet = useSheet();

  return (
    <FieldGroup>
      <FieldGroup.Section title="Preferences">
        <FieldGroup.Link
          title="Fruit"
          value={props.fruit}
          onPress={() => sheet.push('fruit')}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

const fruitOptions = fruits.map((fruit) => ({ value: fruit, label: fruit }));

// The choices are the section's own rows, a check on the chosen one; a pick goes back with the new value.
function FruitPage(props: {
  fruit: string;
  onSelect: (fruit: string) => void;
}): ReactElement {
  const sheet = useSheet();

  return (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Picker
          title="Fruit"
          presentation="inline"
          options={fruitOptions}
          value={props.fruit}
          onValueChange={(fruit) => {
            props.onSelect(fruit);
            sheet.back();
          }}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}
