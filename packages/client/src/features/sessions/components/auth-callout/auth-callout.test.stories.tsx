import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { AuthCallout } from './auth-callout';
import { authCallouts, codexMethods } from './auth-callout.mocks';

const menuLabel = 'Authentication options';

const meta = {
  title: 'Tests/Sessions/AuthCallout',
  component: AuthCallout,
  args: {
    ...authCallouts.severalMethods,
    onAuthenticate: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AuthCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

const { chatGpt, apiKey, openAiKey } = codexMethods;

// The menu lists the methods in the Agent's order; the chosen one is what the button signs in with, and its description names the button.
function methodOrder(width: number): Story {
  return {
    play: async ({ canvasElement, userEvent, args }) => {
      await settleViewport(width);
      // A phone draws the callout in a sheet outside the canvas.
      const page = within(canvasElement.ownerDocument.body);
      await expect(
        await page.findByRole('button', { name: chatGpt.description }),
      ).toBeVisible();
      await userEvent.click(page.getByRole('button', { name: menuLabel }));

      const options = await page.findAllByRole('menuitemradio');
      const order = [chatGpt.name, apiKey.name, openAiKey.name];
      await expect(options).toHaveLength(order.length);

      for (const [index, name] of order.entries())
        await expect(options[index]).toHaveAccessibleName(name);
      await userEvent.click(
        page.getByRole('menuitemradio', { name: openAiKey.name }),
      );
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await expect(args.onAuthenticate).not.toHaveBeenCalled();
      await userEvent.click(
        page.getByRole('button', { name: openAiKey.description }),
      );
      await expect(args.onAuthenticate).toHaveBeenCalledOnce();
      await expect(args.onAuthenticate).toHaveBeenCalledWith(openAiKey.id);
    },
  };
}

export const WideMethodOrder = methodOrder(layoutWidths.wide);

export const PhoneMethodOrder = methodOrder(layoutWidths.phone);

// One method is one button, named for screen readers by the method's description.
export const OneMethod: Story = {
  args: authCallouts.oneMethod,
  play: async ({ canvasElement, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const page = within(canvasElement.ownerDocument.body);

    const method = await page.findByRole('button', {
      name: chatGpt.description,
    });

    await expect(method).toHaveTextContent(chatGpt.name);
    await expect(page.queryByRole('button', { name: menuLabel })).toBeNull();
    await userEvent.click(method);
    await expect(args.onAuthenticate).toHaveBeenCalledOnce();
    await expect(args.onAuthenticate).toHaveBeenCalledWith(chatGpt.id);
  },
};

// While a sign-in runs, Cancel is the only action.
export const PendingCancels: Story = {
  args: authCallouts.pending,
  play: async ({ canvasElement, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      await page.findByText('Authenticating to Codex…'),
    ).toBeVisible();
    await expect(
      page.queryByRole('button', { name: chatGpt.description }),
    ).toBeNull();
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onAuthenticate).not.toHaveBeenCalled();
  },
};

// A running terminal method's own sheet takes the callout's place on a phone; a wide window keeps Cancel beside its panel.
function terminalRuns(width: number, callout: boolean): Story {
  return {
    args: { ...authCallouts.pending, terminal: true },
    play: async ({ canvasElement }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await waitFor(() =>
        expect(page.queryAllByRole('button', { name: 'Cancel' })).toHaveLength(
          callout ? 1 : 0,
        ),
      );
    },
  };
}

export const WideTerminalKeepsCallout = terminalRuns(layoutWidths.wide, true);

export const PhoneTerminalTakesItsPlace = terminalRuns(
  layoutWidths.phone,
  false,
);
