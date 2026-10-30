import type { TurnEnd } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { feedContentArgs } from '../feed-content/feed-content.mocks';
import { Feed } from '../feed/feed';
import { endings, turnEndItems } from './turn-end.mocks';

const meta = {
  title: 'Tests/Feed/TurnEnd',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedContentArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const errorTitle = 'The Turn ended with an error';

function ending(
  width: number,
  end: TurnEnd,
  expected: { title: string; description?: string },
): Story {
  return {
    args: { items: turnEndItems(end) },
    play: async ({ canvas }) => {
      await settleLayout(width);
      const role = end.stopReason === 'error' ? 'alert' : 'status';
      await expect(canvas.getByRole(role)).toBeVisible();
      await expect(canvas.getByRole(role)).toHaveTextContent(expected.title);

      if (expected.description)
        await expect(canvas.getByRole(role)).toHaveTextContent(
          expected.description,
        );
      await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
      await expect(canvas.queryByText('Turn ended')).not.toBeInTheDocument();
    },
  };
}

export const StoppedPhone = ending(layoutWidths.phone, endings.stopped, {
  title: 'You stopped after 1m 20s',
});

export const StoppedWide = ending(layoutWidths.wide, endings.stopped, {
  title: 'You stopped after 1m 20s',
});

export const DeniedPhone = ending(layoutWidths.phone, endings.denied, {
  title: 'Turn ended after you denied a Permission request',
});

export const DeniedWide = ending(layoutWidths.wide, endings.denied, {
  title: 'Turn ended after you denied a Permission request',
});

export const OutputLimitPhone = ending(
  layoutWidths.phone,
  endings.outputLimit,
  { title: 'Stopped at the output limit. Send “continue” to pick up.' },
);

export const OutputLimitWide = ending(layoutWidths.wide, endings.outputLimit, {
  title: 'Stopped at the output limit. Send “continue” to pick up.',
});

export const StepLimitPhone = ending(layoutWidths.phone, endings.stepLimit, {
  title: 'Stopped after too many steps in one Turn',
});

export const StepLimitWide = ending(layoutWidths.wide, endings.stepLimit, {
  title: 'Stopped after too many steps in one Turn',
});

export const RefusedPhone = ending(layoutWidths.phone, endings.refused, {
  title: 'The Agent declined this request',
});

export const RefusedWide = ending(layoutWidths.wide, endings.refused, {
  title: 'The Agent declined this request',
});

export const ErrorPhone = ending(layoutWidths.phone, endings.error, {
  title: errorTitle,
  description: 'The model request failed',
});

export const ErrorWide = ending(layoutWidths.wide, endings.error, {
  title: errorTitle,
  description: 'The model request failed',
});

export const ErrorWithoutDetailsPhone = ending(
  layoutWidths.phone,
  endings.errorWithoutDetails,
  { title: errorTitle },
);

export const ErrorWithoutDetailsWide = ending(
  layoutWidths.wide,
  endings.errorWithoutDetails,
  { title: errorTitle },
);

export const AuthenticationRequiredPhone = ending(
  layoutWidths.phone,
  endings.authenticationRequired,
  { title: 'Authentication required' },
);

export const AuthenticationRequiredWide = ending(
  layoutWidths.wide,
  endings.authenticationRequired,
  { title: 'Authentication required' },
);

export const StorageFailurePhone = ending(
  layoutWidths.phone,
  endings.storageFailure,
  {
    title: errorTitle,
    description: 'Storage is failing, so the Turn was cancelled',
  },
);

export const StorageFailureWide = ending(
  layoutWidths.wide,
  endings.storageFailure,
  {
    title: errorTitle,
    description: 'Storage is failing, so the Turn was cancelled',
  },
);
