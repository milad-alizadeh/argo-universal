import type { RequestMock } from '@repo/mocks/app';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  agentOptions,
  agentOptionsProps,
} from '../../../src/features/requests/components/request.mocks';
import type { Story } from './permission-story-context.test.mocks';

interface ClickEvent {
  click: (element: Element) => Promise<void>;
}

export const alwaysAllow = 'Always Allow';
export const alwaysAllowId = 'allow-always';
const optionNames = agentOptions.map((option) => option.name);
if (optionNames.join() !== 'Always Allow,Allow,Reject')
  throw new Error('Recorded catalog needs Always Allow, Allow and Reject.');

export function agentOptionsArgs(
  mock?: RequestMock,
  options = agentOptions,
): Story['args'] {
  return agentOptionsProps({
    mock,
    options,
    onAnswer: fn(),
    onDenialMessageChange: fn(),
  });
}

export async function pickFromMenu(
  userEvent: ClickEvent,
  option: string,
): Promise<void> {
  const overlay = within(document.body);
  const item = await overlay.findByRole('menuitemradio', { name: option });
  await waitFor(() => expect(item).toBeVisible());
  await userEvent.click(item);
  await waitFor(() =>
    expect(
      overlay.queryByRole('menuitemradio', { name: option }),
    ).not.toBeInTheDocument(),
  );
}

export async function pickFromSheet(
  userEvent: ClickEvent,
  label: string,
  option: string,
): Promise<void> {
  const overlay = within(document.body);
  const sheet = within(await overlay.findByRole('dialog', { name: label }));
  await userEvent.click(sheet.getByRole('button', { name: option }));
  await waitFor(() =>
    expect(
      overlay.queryByRole('dialog', { name: label }),
    ).not.toBeInTheDocument(),
  );
}
