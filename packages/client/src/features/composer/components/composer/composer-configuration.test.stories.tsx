import { recordedSessionOptions } from '@repo/mocks/app';
import { fn } from 'storybook/test';
import { within } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { expect } from 'storybook/test';
import { composerLongAgentCatalog } from '../../../../../mocks/composer-mock';
import { agentsNeedingSetup } from '../../../../../mocks/composer/agent-availability.test.mocks';
import { phoneStatusControls } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import { createdCheckoutIsReadOnly } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { chooseAgentLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { pickers } from '../../../../../mocks/composer/configuration-picker.test.mocks';
import { firstAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { secondAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';

const meta = { ...composerTestMeta, title: 'Tests/Composer' };

export default meta;

export const PickersPhoneFirstAgent = pickers(layoutWidths.phone, 0);

export const PickersPhoneSecondAgent = pickers(layoutWidths.phone, 1);

export const PickersWideFirstAgent = pickers(layoutWidths.wide, 0);

export const PickersWideSecondAgent = pickers(layoutWidths.wide, 1);

export const CheckoutPhone = phoneStatusControls(firstAgent);

export const CheckoutPhoneSecondAgent = phoneStatusControls(secondAgent);

export const CreatedCheckoutIsReadOnlyPhone = createdCheckoutIsReadOnly(
  layoutWidths.phone,
);

export const CreatedCheckoutIsReadOnlyWide = createdCheckoutIsReadOnly(
  layoutWidths.wide,
);

export const ScrollableAgentCatalog: Story = {
  args: {
    configuration: {
      agents: composerLongAgentCatalog,
      agent: 'development-agent-1',
      configOptions: recordedSessionOptions(firstAgent.agent),
      onConfigChange: fn(),
      onAgentChange: fn(),
      checkout: { branch: 'main', newWorktree: true },
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: chooseAgentLabel }),
    );
    const scroll = await overlay.findByTestId('composer-agents-scroll');
    await waitFor(async () => {
      await expect(scroll.clientHeight).toBeGreaterThan(100);
      await expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
    });
    const menu = overlay.getByRole('dialog', { name: 'Select Agent' });
    await Promise.all(
      menu
        .getAnimations({ subtree: true })
        // The opening ones; a scroll fade follows the scroll and never finishes.
        .filter((animation) => animation.timeline instanceof DocumentTimeline)
        .map((animation) => animation.finished),
    );
    await waitFor(() => expect(menu).toBeVisible());
    const heading = overlay.getByText('Select Agent', { exact: true });
    const headingTop = heading.getBoundingClientRect().top;
    const menuHeight = menu.getBoundingClientRect().height;
    await expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    scroll.scrollTop = scroll.scrollHeight;

    const lastAgent = await overlay.findByRole('button', {
      name: 'Select Agent 40',
    });

    await waitFor(async () => {
      const item = lastAgent.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      await expect(item.top).toBeGreaterThanOrEqual(viewport.top);
      await expect(item.bottom).toBeLessThanOrEqual(viewport.bottom);
      await expect(heading.getBoundingClientRect().top).toBeCloseTo(headingTop);
      await expect(menu.getBoundingClientRect().height).toBeCloseTo(menuHeight);
    });
    await userEvent.click(lastAgent);
    await expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
      'development-agent-40',
    );
    await expect(overlay.getByText('Model', { exact: true })).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

export const AgentsNeedingSetupPhone = agentsNeedingSetup(layoutWidths.phone);

export const AgentsNeedingSetupWide = agentsNeedingSetup(layoutWidths.wide);
