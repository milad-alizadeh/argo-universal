import { expect, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { layoutWidths } from '../src/lib/generic/each-layout';
import { shownText } from './rich-textarea-example';
import { closeWrittenPlan, openWrittenPlan } from './written-plan-open-checks';
import {
  writtenPlanRegionName,
  type WrittenPlanPlayContext,
} from './written-plan-story-types';

function scrollableDocument(
  width: number,
  body: ReturnType<typeof within>,
  content: HTMLElement,
): HTMLElement {
  const scroll: HTMLElement | null =
    width === layoutWidths.wide
      ? body.getByLabelText('Written plan document')
      : content.parentElement;

  return nearestScrollable(scroll);
}

function nearestScrollable(scroll: HTMLElement | null): HTMLElement {
  let ancestor = scroll;

  while (canAdvanceScroll(ancestor)) ancestor = ancestor.parentElement;

  if (!ancestor)
    throw new Error('Long written Plan needs a scrollable document');

  return ancestor;
}

function canAdvanceScroll(scroll: HTMLElement | null): scroll is HTMLElement {
  return scroll !== null && scroll.scrollHeight <= scroll.clientHeight;
}

async function scrollToPlanEnd(
  scroll: HTMLElement,
  end: HTMLElement,
): Promise<void> {
  scroll.scrollTop = scroll.scrollHeight;
  await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
  await expect(end.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    scroll.getBoundingClientRect().bottom,
  );
  await expect(end.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    scroll.getBoundingClientRect().top,
  );
}

async function typeBesideLongPlan({
  canvas,
}: WrittenPlanPlayContext): Promise<void> {
  const composer = canvas.getByRole('textbox');
  await expect(composer).toBeVisible();
  await expect(composer.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    window.innerHeight,
  );
  await browserUserEvent.type(composer, 'Keep the last step.');
  await expect(shownText(composer)).toBe('Keep the last step.');
}

export async function readsLongWrittenPlan(
  width: number,
  context: WrittenPlanPlayContext,
): Promise<void> {
  const body = await openWrittenPlan(width, context);
  const content = body.getByRole('region', { name: writtenPlanRegionName });
  const end = within(content).getByText('End of the written plan.');
  await scrollToPlanEnd(scrollableDocument(width, body, content), end);

  if (width === layoutWidths.wide) await typeBesideLongPlan(context);
  await closeWrittenPlan(context, body);
}
