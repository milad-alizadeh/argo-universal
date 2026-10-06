import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { PhoneShellMock } from '../../mocks/phone-shell-mock';

const meta = {
  title: 'Tests/PhoneShell',
  component: PhoneShellMock,
  render: (args) => (
    <View className="h-[600px] w-full">
      <PhoneShellMock {...args} />
    </View>
  ),
} satisfies Meta<typeof PhoneShellMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardHeightAnimatesWithDrawer: Story = {
  play: async ({ canvas, userEvent }) => {
    const card = canvas.getByTestId('phone-shell-card');
    const closedHeight = card.getBoundingClientRect().height;
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open navigation' }),
    );
    const openingHeights: number[] = [];
    for (let frame = 0; frame < 12; frame += 1) {
      await new Promise(requestAnimationFrame);
      openingHeights.push(card.getBoundingClientRect().height);
    }
    await waitFor(() =>
      expect(card.getBoundingClientRect().height).toBeLessThan(closedHeight),
    );
    const openHeight = card.getBoundingClientRect().height;
    await expect(
      openingHeights.some(
        (height) => height > openHeight + 1 && height < closedHeight - 1,
      ),
    ).toBe(true);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close navigation' }),
    );
    const closingHeights: number[] = [];
    for (let frame = 0; frame < 12; frame += 1) {
      await new Promise(requestAnimationFrame);
      closingHeights.push(card.getBoundingClientRect().height);
    }
    await expect(
      closingHeights.some(
        (height) => height > openHeight + 1 && height < closedHeight - 1,
      ),
    ).toBe(true);
    await waitFor(() =>
      expect(card.getBoundingClientRect().height).toBe(closedHeight),
    );
  },
};

export const MenuOpensAndSelectionClosesDrawer: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1024]) {
      await page.viewport(width, 844);
      for (const section of ['Sessions', 'Issues', 'Atlas', 'Settings']) {
        await expect(
          canvas.queryByRole('button', { name: 'Sessions' }),
        ).toBeNull();
        const content = canvas.getByTestId('phone-shell-content');
        const closedPosition = canvas
          .getByTestId('phone-shell')
          .getBoundingClientRect().left;
        // The previous selection's close animation must settle before the menu button is clicked.
        await waitFor(() =>
          expect(content.getBoundingClientRect().left).toBeCloseTo(
            closedPosition,
            0,
          ),
        );
        await userEvent.click(
          canvas.getByRole('button', { name: 'Open navigation' }),
        );
        await expect(
          canvas.getByRole('heading', { name: 'Argo' }),
        ).toBeVisible();
        await waitFor(() =>
          expect(content.getBoundingClientRect().left).toBeGreaterThan(
            closedPosition + 250,
          ),
        );
        await expect(
          canvas.getByLabelText('1 Session needs attention'),
        ).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: section }));
        await expect(
          canvas.getByRole('heading', { name: section }),
        ).toBeVisible();
        await expect(
          canvas.queryByRole('heading', { name: 'Argo' }),
        ).toBeNull();
      }
    }
  },
};

const checkAttentionAndSectionStates: NonNullable<Story['play']> = async ({
  canvas,
  userEvent,
  args,
}) => {
  const { page } = await import('vitest/browser');
  const count = args.attentionCount ?? 1;
  for (const width of [390, 1024]) {
    await page.viewport(width, 844);
    for (const section of ['Sessions', 'Issues', 'Atlas', 'Settings']) {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open navigation' }),
      );
      const badge = canvas.queryByLabelText(
        `${count} ${count === 1 ? 'Session needs' : 'Sessions need'} attention`,
      );
      if (count === 0) await expect(badge).toBeNull();
      else await expect(badge).toHaveTextContent(count > 99 ? '99+' : '1');
      await userEvent.click(canvas.getByRole('button', { name: section }));
      await expect(
        canvas.getByRole('heading', { name: section }),
      ).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open navigation' }),
      );
      await expect(
        canvas.getByRole('button', { name: section }),
      ).toHaveAttribute('aria-selected', 'true');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close navigation' }),
      );
      await expect(canvas.queryByRole('heading', { name: 'Argo' })).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: `Search ${section}` }),
      );
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Search opened',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: `Filter ${section}` }),
      );
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Filter opened',
      );
    }
  }
};

export const NoAttention: Story = {
  args: { attentionCount: 0 },
  play: checkAttentionAndSectionStates,
};

export const OneAttention: Story = {
  args: { attentionCount: 1 },
  play: checkAttentionAndSectionStates,
};

export const OverflowAttention: Story = {
  args: { attentionCount: 100 },
  play: checkAttentionAndSectionStates,
};
