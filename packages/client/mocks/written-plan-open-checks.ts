import { expect, spyOn, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { layoutWidths } from '../src/lib/generic/each-layout';
import { settleViewport } from '../src/lib/generic/settle-viewport';
import { shownText } from './rich-textarea-example';
import {
  writtenPlanRegionName,
  type WrittenPlanPlayContext,
  type WrittenPlanScenario,
} from './written-plan-story-types';
type Body = ReturnType<typeof within>;
export async function openWrittenPlan(
  width: number,
  { canvas, userEvent }: WrittenPlanPlayContext,
): Promise<Body> {
  await settleViewport(width);
  await userEvent.click(canvas.getByRole('button', { name: 'Written plan' }));
  return within(document.body);
}
async function markdownPlan(body: Body): Promise<void> {
  await waitFor(() =>
    expect(
      within(
        body.getByRole('region', { name: writtenPlanRegionName }),
      ).getByRole('heading', { name: 'Read-only Plan', level: 1 }),
    ).toBeVisible(),
  );
}
async function filePlan(
  body: Body,
  userEvent: WrittenPlanPlayContext['userEvent'],
): Promise<void> {
  await expect(body.getByLabelText('file:///project/plan.md')).toBeVisible();
  await expect(
    body.getByText('The Agent shared where the plan is, not its text.'),
  ).toBeVisible();
  await copyPlanUri(body, userEvent);
}
async function copyPlanUri(
  body: Body,
  userEvent: WrittenPlanPlayContext['userEvent'],
): Promise<void> {
  const clipboard = spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  try {
    await userEvent.click(body.getByRole('button', { name: 'Copy URI' }));
    await waitFor(() =>
      expect(clipboard).toHaveBeenCalledWith('file:///project/plan.md'),
    );
  } finally {
    clipboard.mockRestore();
  }
}
async function readOnlyPlan(body: Body): Promise<void> {
  await expect(
    body.queryByRole('button', { name: 'Approve' }),
  ).not.toBeInTheDocument();
  await expect(
    body.queryByRole('button', { name: 'Keep planning' }),
  ).not.toBeInTheDocument();
}
async function followUpWhileReading(
  { canvas }: WrittenPlanPlayContext,
  body: Body,
): Promise<void> {
  await browserUserEvent.type(
    canvas.getByRole('textbox'),
    'Follow up on this plan.',
  );
  await expect(shownText(canvas.getByRole('textbox'))).toBe(
    'Follow up on this plan.',
  );
  await expect(
    body.getByRole('region', { name: writtenPlanRegionName }),
  ).toBeVisible();
}
export async function closeWrittenPlan(
  context: WrittenPlanPlayContext,
  body: Body,
): Promise<void> {
  await context.userEvent.keyboard('{Escape}');
  await waitFor(() =>
    expect(
      body.queryByRole('region', { name: writtenPlanRegionName }),
    ).not.toBeInTheDocument(),
  );
}
export async function opensWrittenPlan(
  scenario: WrittenPlanScenario,
  context: WrittenPlanPlayContext,
): Promise<void> {
  const body = await openWrittenPlan(scenario.width, context);
  await assertPhoneCloseControl(scenario.width, body);
  await readWrittenPlanForm(scenario, context, body);
  await readOnlyPlan(body);
  if (scenario.width === layoutWidths.wide)
    await followUpWhileReading(context, body);
  await closeWrittenPlan(context, body);
}

async function assertPhoneCloseControl(
  width: number,
  body: Body,
): Promise<void> {
  if (width !== layoutWidths.phone) return;
  await expect(
    body.queryByRole('button', { name: 'Close written plan' }),
  ).not.toBeInTheDocument();
}
async function assertPhonePlanHeading(
  scenario: WrittenPlanScenario,
  body: Body,
): Promise<void> {
  if (scenario.width !== layoutWidths.phone) return;
  if (scenario.form !== 'markdown') return;
  await expect(
    body.getAllByRole('heading', { name: 'Read-only Plan' }),
  ).toHaveLength(1);
}
async function readWrittenPlanForm(
  scenario: WrittenPlanScenario,
  context: WrittenPlanPlayContext,
  body: Body,
): Promise<void> {
  await (scenario.form === 'markdown'
    ? markdownPlan(body)
    : filePlan(body, context.userEvent));
  await assertPhonePlanHeading(scenario, body);
}
