import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Variation, Variations as VariationList } from '../../../variations';
import { Sheet } from './sheet';
import { useSheet } from './sheet-pages';
import type { SheetProps } from './sheet-props';

const meta = {
  title: 'Design System/Primitives/Overlays/Sheet',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Sheet',
  render: () => <SheetVariations />,
};

function SheetVariations(): ReactElement {
  return (
    <VariationList>
      <Variation label="Fits its content">
        <ExampleSheet label="Options" />
      </Variation>
      <Variation label="With a footer">
        <ExampleSheet label="Footer" footer={<SubmitFooter />} />
      </Variation>
      <TallVariations />
    </VariationList>
  );
}

function TallVariations(): ReactElement {
  return (
    <>
      <Variation label="Full height">
        <ExampleSheet label="Tall" detents={['large']} />
      </Variation>
      <Variation label="With pages">
        <PagedSheet />
      </Variation>
    </>
  );
}

const choices = ['Option one', 'Option two', 'Option three'];

type ExampleProps = Pick<SheetProps, 'detents' | 'footer'> & {
  label: string;
};

export function ExampleSheet(props: ExampleProps): ReactElement {
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

function SubmitFooter(): ReactElement {
  return (
    <View className="p-4">
      <Button label="Submit" />
    </View>
  );
}

const fruits = ['Apple', 'Banana', 'Cherry'];

export function PagedSheet(): ReactElement {
  const [open, setOpen] = useState(false);
  const [fruit, setFruit] = useState(fruits[0]);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      label="Settings"
      contentScrolls
      trigger={<MenuTrigger label="Settings" />}
    >
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
    <List appearance="grouped" fit>
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
