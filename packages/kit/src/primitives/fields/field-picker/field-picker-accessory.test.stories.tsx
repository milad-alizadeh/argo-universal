import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { fixedMeter } from './field-picker-accessory-fixtures';
import { ControlledPicker } from './field-picker-controlled';
import { inSection } from './field-picker-decorators';
import { menu, screenWithSearch } from './field-picker-fixtures';

const changed = fn<(value: string | readonly string[]) => void>();

const played = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldPicker/Accessory',
  beforeEach: (): void => {
    changed.mockClear();
    played.mockClear();
  },
  decorators: inSection,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const play = { icon: 'play', label: 'Play Two', onPress: played } as const;

const playButton = { name: 'Play Two' };

// The button is its own target: pressing it previews, and the picker stays shut with its value.
export const PressingTheButtonLeavesThePickerShut: Story = {
  render: () => (
    <ControlledPicker {...menu} accessory={play} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', playButton));
    await expect(played).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('listbox')).toBeNull();
    await expect(changed).not.toHaveBeenCalled();
  },
};

// Named for a screen reader on its own, with no pressed state, as a one-shot action reads.
export const TheButtonIsNamedAndUnpressed: Story = {
  render: () => <ControlledPicker {...menu} accessory={play} />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', playButton);
    await expect(button).not.toHaveAttribute('aria-pressed');
    await expect(canvas.getByRole('button', { name: /^Label/ })).toBeVisible();
  },
};

// Tab reaches the picker, then the button after it; Enter presses the button.
export const TheKeyboardReachesTheButton: Story = {
  render: () => <ControlledPicker {...menu} accessory={play} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: /^Label/ })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', playButton)).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(played).toHaveBeenCalledOnce();
  },
};

// A row that opens a page carries the button too.
export const APageRowCarriesTheButton: Story = {
  render: () => <ControlledPicker {...screenWithSearch} accessory={play} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', playButton));
    await expect(played).toHaveBeenCalledOnce();
  },
};

// The level glyph lights as many of its eight bars as the level reaches, and is hidden from screen readers.
export const TheGlyphLightsTheLevel: Story = {
  render: () => <ControlledPicker {...menu} meter={fixedMeter(0.5)} />,
  play: async ({ canvas }) => {
    const glyph = canvas.getByTestId('field-picker-meter');
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    await expect(
      glyph.querySelectorAll('[data-testid="field-picker-meter-lit"]'),
    ).toHaveLength(4);
  },
};
