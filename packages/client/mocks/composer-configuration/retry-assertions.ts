import { expect, waitFor, within } from 'storybook/test';
import type { RetryScenario } from './retry-case';

export async function assertCantStartRows({
  recorded,
}: RetryScenario): Promise<HTMLElement> {
  const overlay = within(document.body);

  const row = await overlay.findByRole('button', {
    name: `Select ${recorded.agent.label}`,
  });

  await waitFor(() => expect(row).toBeVisible());
  await expect(row).toBeDisabled();
  await expect(row).toHaveTextContent('Can’t start');
  await expect(row).toHaveTextContent(recorded.reason);
  await assertOtherAgentDisabled(recorded.other.label);

  return assertRetryAction(recorded.agent.label);
}

async function assertRetryAction(label: string): Promise<HTMLElement> {
  const overlay = within(document.body);
  const retry = overlay.getByRole('button', { name: `Recheck ${label}` });
  await expect(retry).toHaveTextContent('Recheck');
  await expect(
    overlay.queryByText('Install', { exact: true }),
  ).not.toBeInTheDocument();

  return retry;
}

export async function assertRetryResults(
  scenario: RetryScenario,
): Promise<void> {
  await expect(scenario.onAgentRetry).toHaveBeenCalledOnce();
  await assertCantStartContentRemoved(scenario);

  for (const label of [
    scenario.recorded.agent.label,
    scenario.recorded.other.label,
  ])
    await assertRetrySelection(label, scenario.session);
  await expect(scenario.onAgentChange).not.toHaveBeenCalled();
}

async function assertCantStartContentRemoved({
  recorded,
}: RetryScenario): Promise<void> {
  const overlay = within(document.body);
  await assertCantStartGone();
  await expect(overlay.queryByText(recorded.reason)).not.toBeInTheDocument();
  await expect(
    overlay.queryByRole('button', { name: `Recheck ${recorded.agent.label}` }),
  ).not.toBeInTheDocument();
}

async function assertRetrySelection(
  label: string,
  session: RetryScenario['session'],
): Promise<void> {
  const choice = within(document.body).getByRole('button', {
    name: `Select ${label}`,
  });

  await (session === 'new'
    ? expect(choice).toBeEnabled()
    : expect(choice).toBeDisabled());
}

async function assertOtherAgentDisabled(label: string): Promise<void> {
  await expect(
    within(document.body).getByRole('button', { name: `Select ${label}` }),
  ).toBeDisabled();
}

async function assertCantStartGone(): Promise<void> {
  await waitFor(() =>
    expect(
      within(document.body).queryByText('Can’t start', { exact: true }),
    ).not.toBeInTheDocument(),
  );
}
