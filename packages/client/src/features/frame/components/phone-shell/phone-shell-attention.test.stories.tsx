import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { shellSections } from '../shell-sections';
import {
  type Canvas,
  controlledPhoneLayout,
  drawerSections,
  openNavigationLabel,
  pickDrawerSection,
  withPhoneLayout,
} from './phone-layout-test.mocks';

const meta = {
  ...controlledPhoneLayout,
  title: 'Tests/PhoneShell/Attention',
} satisfies Meta<typeof controlledPhoneLayout.component>;

export default meta;

type Story = StoryObj<typeof meta>;

interface AttentionCase {
  count: number;
  label: string;
  text: string | null;
}

const noAttention: AttentionCase = {
  count: 0,
  label: '0 Sessions need attention',
  text: null,
};

const oneAttention: AttentionCase = {
  count: 1,
  label: '1 Session needs attention',
  text: '1',
};

const overflowAttention: AttentionCase = {
  count: 100,
  label: '100 Sessions need attention',
  text: '99+',
};

async function expectBadge(
  canvas: Canvas,
  { label, text }: AttentionCase,
): Promise<void> {
  const badge = canvas.queryByLabelText(label);

  if (text === null) return expect(badge).toBeNull();

  return expect(badge).toHaveTextContent(text);
}

function attentionAndSectionStates(
  attention: AttentionCase,
  width: number,
): Story {
  return {
    args: { attentionCount: attention.count },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await withPhoneLayout(
        { canvas, attention: attention.count },
        async (layout) => {
          for (const section of drawerSections) {
            await userEvent.click(
              canvas.getByRole('button', { name: openNavigationLabel }),
            );
            await expectBadge(canvas, attention);
            await pickDrawerSection({ canvas, userEvent, layout, section });
            await userEvent.click(
              canvas.getByRole('button', { name: openNavigationLabel }),
            );
            await expect(
              canvas.getByRole('button', {
                name: shellSections[section].title,
              }),
            ).toHaveAttribute('aria-pressed', 'true');
            await userEvent.click(
              canvas.getByRole('button', { name: 'Close navigation' }),
            );
            await expect(
              canvas.queryByRole('heading', { name: 'Argo' }),
            ).toBeNull();
          }
        },
      );
    },
  };
}

export const NoAttentionPhone = attentionAndSectionStates(
  noAttention,
  layoutWidths.phone,
);

export const NoAttentionTablet = attentionAndSectionStates(
  noAttention,
  layoutWidths.tablet,
);

export const OneAttentionPhone = attentionAndSectionStates(
  oneAttention,
  layoutWidths.phone,
);

export const OneAttentionTablet = attentionAndSectionStates(
  oneAttention,
  layoutWidths.tablet,
);

export const OverflowAttentionPhone = attentionAndSectionStates(
  overflowAttention,
  layoutWidths.phone,
);

export const OverflowAttentionTablet = attentionAndSectionStates(
  overflowAttention,
  layoutWidths.tablet,
);
