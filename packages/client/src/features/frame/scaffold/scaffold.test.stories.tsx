import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import {
  currentAttribute,
  detailContentId,
  hiddenAttribute,
  hideSidebarLabel,
  listContentId,
  railId,
  sessionListId,
  toggleSidebar,
} from './scaffold-controls.mocks';
import {
  type ControlledScaffold,
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

const sections = [
  ['Sessions', 'sessions'],
  ['Settings', 'settings'],
] as const;

async function expectSidebarInsideScaffold({
  canvas,
}: ScaffoldPlayContext): Promise<void> {
  await waitFor(() =>
    expect(
      canvas.getByTestId(sessionListId).getBoundingClientRect().width,
    ).toBeGreaterThan(100),
  );
  const frame = canvas.getByTestId('wide-frame').getBoundingClientRect();
  const sidebar = canvas.getByTestId(sessionListId).getBoundingClientRect();
  await expect(sidebar.left).toBeGreaterThanOrEqual(frame.left);
  await waitFor(() =>
    expect(
      canvas.getByTestId(sessionListId).getBoundingClientRect().right,
    ).toBeLessThanOrEqual(frame.right),
  );
}

async function openEachSection(
  context: ScaffoldPlayContext,
  controlled: ControlledScaffold,
): Promise<void> {
  const { canvas, userEvent } = context;
  const rail = canvas.getByTestId(railId);

  const railButtons = new Map(
    sections.map(([name]) => [name, canvas.getByRole('button', { name })]),
  );

  for (const [section, value] of sections) {
    await expect(canvas.getByTestId(railId)).toBe(rail);
    const button = canvas.getByRole('button', { name: section });
    await expect(button).toBe(railButtons.get(section));
    await userEvent.click(button);
    await expect(controlled.onSectionChange).toHaveBeenLastCalledWith(value);
    await controlled.render({ selectedSection: value });
    await expect(canvas.getByRole('button', { name: section })).toHaveAttribute(
      currentAttribute,
      'page',
    );
    await expect(canvas.getByTestId(listContentId)).toHaveTextContent(
      `${section} list`,
    );
    await expect(canvas.getByTestId(detailContentId)).toHaveTextContent(
      `${section} detail`,
    );
  }
}

function sectionsAndSidebar(width: number): ScaffoldStory {
  return {
    play: controlledPlay(async (context, controlled) => {
      const { canvas } = context;
      await settleViewport(width);
      await expectSidebarInsideScaffold(context);
      await openEachSection(context, controlled);
      await toggleSidebar(context, controlled, false);
      await expect(canvas.getByTestId(sessionListId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await toggleSidebar(context, controlled, true);
      await expect(canvas.getByTestId(listContentId)).toBeVisible();
    }),
  };
}

export const SectionsAndSidebarPhone = sectionsAndSidebar(layoutWidths.phone);

export const SectionsAndSidebarWide = sectionsAndSidebar(layoutWidths.wide);

// The rail lists the core sections in order and keeps the sidebar toggle last; only the open section is current.
export const RailListsSectionsThenTheSidebarToggle: ScaffoldStory = {
  args: { selectedSection: 'settings' },
  play: controlledPlay(async ({ canvas }) => {
    await page.viewport(1440, 844);
    const rail = within(canvas.getByTestId(railId));
    await expect(
      rail
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Sessions', 'Settings', hideSidebarLabel]);
    await expect(
      rail.getByRole('button', { name: 'Settings' }),
    ).toHaveAttribute(currentAttribute, 'page');

    await expect(
      rail.getByRole('button', { name: 'Sessions' }),
    ).not.toHaveAttribute(currentAttribute);
  }),
};

function attention(
  attentionCount: number,
  check: (canvas: ScaffoldPlayContext['canvas']) => Promise<void>,
): ScaffoldStory {
  return {
    args: { attentionCount },
    play: controlledPlay(async ({ canvas }) => {
      for (const width of [390, 1440]) {
        await page.viewport(width, 844);
        await check(canvas);
      }
    }),
  };
}

export const NoAttention = attention(0, async (canvas) => {
  await expect(
    canvas.queryByLabelText(/Sessions? needs? attention/),
  ).toBeNull();
});

export const OneAttention = attention(1, async (canvas) => {
  await expect(
    canvas.getByLabelText('1 Session needs attention'),
  ).toHaveTextContent('1');
});

export const OverflowAttention = attention(100, async (canvas) => {
  await expect(
    canvas.getByLabelText('100 Sessions need attention'),
  ).toHaveTextContent('99+');
});
