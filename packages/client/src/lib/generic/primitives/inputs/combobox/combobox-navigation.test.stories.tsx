import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import {
  Choice,
  Form,
  changed,
  blurred,
  fruitTrigger,
} from './combobox-navigation.test.mocks';

const cherryTrigger = 'Fruit: Cherry';

const meta = {
  title: 'Tests/ComboboxNavigation',
  beforeEach: async (): Promise<void> => {
    await settleViewport(390);
    changed.mockClear();
    blurred.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const BackAndReopen: Story = {
  render: () => <Form />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    await userEvent.click(
      await page.findByRole('button', { name: fruitTrigger }),
    );
    await userEvent.click(
      await page.findByRole('button', { name: 'Back to Settings' }),
    );
    await expect(changed).not.toHaveBeenCalled();
    await expect(blurred).toHaveBeenCalledTimes(1);
    await userEvent.click(
      await page.findByRole('button', { name: fruitTrigger }),
    );
    await userEvent.click(await page.findByRole('radio', { name: 'Cherry' }));
    await expect(
      await page.findByRole('button', { name: cherryTrigger }),
    ).toBeVisible();
    await expect(changed).toHaveBeenCalledTimes(1);
    await expect(changed).toHaveBeenCalledWith('Cherry');
    await expect(blurred).toHaveBeenCalledTimes(2);
    await userEvent.click(page.getByRole('button', { name: cherryTrigger }));
    await waitFor(() =>
      expect(page.getByRole('radio', { name: 'Cherry' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    await userEvent.keyboard('{Escape}');
    await expect(blurred).toHaveBeenCalledTimes(3);
    await expect(changed).toHaveBeenCalledTimes(1);
  },
};

// The caller changes protection while the field's page is open, as a form begins sending.
export const ProtectionSurvivesBack: Story = {
  render: () => <Form protectable />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    await userEvent.click(
      await page.findByRole('button', { name: fruitTrigger }),
    );
    await page.findByRole('radio', { name: 'Cherry' });
    await userEvent.click(page.getByRole('button', { name: 'Start sending' }));
    await userEvent.click(
      page.getByRole('button', { name: 'Back to Settings' }),
    );
    await userEvent.keyboard('{Escape}');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: fruitTrigger }),
    ).toBeVisible();
    await expect(changed).not.toHaveBeenCalled();
    await userEvent.click(page.getByRole('button', { name: 'Finish sending' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        page.queryByRole('dialog', { name: 'Settings' }),
      ).not.toBeInTheDocument(),
    );
    await expect(blurred).toHaveBeenCalledTimes(1);
  },
};

function standaloneAt(width: number): Story {
  return {
    render: () => <Choice />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      await settleViewport(width);

      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: fruitTrigger }));
      await userEvent.click(await page.findByRole('radio', { name: 'Cherry' }));

      const field = await canvas.findByRole('button', {
        name: cherryTrigger,
      });

      await waitFor(() => expect(field).toHaveFocus());
      await expect(changed).toHaveBeenCalledTimes(1);
      await expect(changed).toHaveBeenCalledWith('Cherry');
      await expect(blurred).toHaveBeenCalledTimes(1);
      await userEvent.click(field);
      await waitFor(() =>
        expect(page.getByRole('radio', { name: 'Cherry' })).toHaveAttribute(
          'aria-checked',
          'true',
        ),
      );
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(field).toHaveFocus());
      await expect(blurred).toHaveBeenCalledTimes(2);
      await expect(changed).toHaveBeenCalledTimes(1);
    },
  };
}

export const StandaloneDrawerReturnsToField = standaloneAt(390);

export const StandaloneModalReturnsToField = standaloneAt(1024);

export const StandalonePopoverReturnsToField = standaloneAt(1440);
