import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn, within } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldPicker } from './field-picker';
import {
  ControlledScreen,
  ControlledPicker,
  ControlledSection,
} from './field-picker-controlled';
import { inSection, inStackedSection } from './field-picker-decorators';
import {
  inline,
  inlineMultiple,
  menu,
  menuMultiple,
  screenMultiple,
  screenWithButton,
  screenWithSearch,
} from './field-picker-fixtures';

const meta = {
  title: 'Design System/Primitives/Forms/FieldPicker',
  component: FieldPicker,
  argTypes: kitArgTypes('FieldGroup.Picker'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

// Every story opens its picker on load, so the open state is what the story shows.
const opened: Play = async ({ canvasElement, userEvent }) => {
  await userEvent.click(
    await within(canvasElement).findByRole('button', { name: /^Label/ }),
  );
};

// A short known list opens in place, as a menu with a mark on the chosen one.
export const Menu: Story = {
  name: 'Menu',
  decorators: inSection,
  args: { ...menu, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
  play: opened,
};

// A short several-of choice opens in place too, and each pick stays open for the next.
export const MenuMultiple: Story = {
  name: 'Menu multiple',
  decorators: inSection,
  args: { ...menuMultiple, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
  play: opened,
};

// A short list shown in place as rows of its section, a check on the chosen one.
export const Inline: Story = {
  name: 'Inline',
  args: { ...inline, onValueChange: fn() },
  render: (args) => <ControlledSection {...args} />,
};

// Several choices as rows too: each row toggles its own value.
export const InlineMultiple: Story = {
  name: 'Inline multiple',
  args: { ...inlineMultiple, onValueChange: fn() },
  render: (args) => <ControlledSection {...args} />,
};

// A long list opens on a page of its own with a search field: pushed with Back on a phone, a popover on a desktop window.
export const ScreenWithSearch: Story = {
  name: 'Screen with search',
  args: { ...screenWithSearch, onValueChange: fn() },
  decorators: inStackedSection,
  render: (args) => <ControlledPicker {...args} />,
  play: opened,
};

// The page's action: below the choices in a desktop popover, a header button on a pushed page.
export const ScreenWithButton: Story = {
  name: 'Screen with button',
  args: { ...screenWithButton, onValueChange: fn() },
  decorators: inStackedSection,
  render: (args) => <ControlledPicker {...args} />,
  play: opened,
};

// Several choices: the page stays open and each toggle reports the whole list.
export const ScreenMultiple: Story = {
  name: 'Screen multiple',
  args: { ...screenMultiple, onValueChange: fn() },
  decorators: inStackedSection,
  render: (args) => <ControlledPicker {...args} />,
  play: opened,
};

// The page's own choices, sectioned and long, with a mark on the chosen one: a native grouped List on a phone.
export const ScreenRows: Story = {
  name: 'Screen rows',
  args: { ...screenWithSearch, onValueChange: fn() },
  render: (args) => <ControlledScreen {...args} />,
};
