import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { RequestMock } from '@repo/mocks/app';
import { expect, within } from 'storybook/test';
import { agentOptionsWithAlwaysReject } from '../../../src/features/requests/components/request.mocks';
import {
  agentOptionsArgs,
  alwaysAllow,
  alwaysAllowId,
  pickFromMenu,
} from './option-menus.test.mocks';
import {
  allowOptions,
  alwaysReject,
  rejectOptions,
  type Story,
} from './permission-story-context.test.mocks';

// Desktop merges every allow option into one split button; the chevron picks what it sends.
export function allowMenuWide(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(1440);
      await expect(
        canvas.queryByRole('button', { name: alwaysAllow }),
      ).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromMenu(userEvent, alwaysAllow);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysAllow }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}

// Enter chooses the allow-once option, even when the Agent lists another first.
export function allowOnceLeads(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(1440);
      await userEvent.click(canvas.getByText(args.request.title));
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({ optionId: 'allow' });
    },
  };
}

// Once picked, Enter sends the picked allow option.
export function enterSendsPicked(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(1440);
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromMenu(userEvent, alwaysAllow);
      await userEvent.click(canvas.getByText(args.request.title));
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}

export function rejectMenuWide(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock, agentOptionsWithAlwaysReject),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(1440);
      await expect(
        canvas.queryByRole('button', { name: alwaysReject }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: rejectOptions }),
      );
      await pickFromMenu(userEvent, alwaysReject);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysReject }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject-always',
      });
    },
  };
}

// Phone width groups options like desktop: two controls, allow on top; the web chevron opens the menu.
export function groupedPhone(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock, agentOptionsWithAlwaysReject),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(390);
      const buttons = canvas.getAllByRole('button');
      await expect(buttons).toHaveLength(4);
      await expect(buttons[0]).toHaveAccessibleName('Allow');
      await expect(buttons[1]).toHaveAccessibleName(allowOptions);
      await expect(buttons[2]).toHaveAccessibleName('Reject');
      await expect(buttons[3]).toHaveAccessibleName(rejectOptions);
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromMenu(userEvent, alwaysAllow);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysAllow }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}

// Rejecting answers at once: an ACP answer is only the chosen option.
export function rejectAnswersAtOnce(width: number, mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleLayout(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Reject' }));
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(args.onAnswer).toHaveBeenCalledWith({ optionId: 'reject' });
    },
  };
}
