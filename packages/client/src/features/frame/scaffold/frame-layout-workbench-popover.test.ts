import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe("the Workbench opened over the content, as Codex's popover", () => {
  it.each([
    { width: 900, workbenchIntent: 'auto' },
    { width: 1440, workbenchIntent: 'hidden' },
    { width: 1440, workbenchIntent: 'shown' },
  ] as const)(
    'overlays the content at $width whatever the intent $workbenchIntent',
    (placement) => {
      const layout = frameLayout({
        ...input,
        ...placement,
        workbenchPopover: true,
      });

      expect(layout.workbench.state).toBe('overlay');
      expect(layout.contentShift).toBe(0);
    },
  );

  it('leaves a page that holds the Workbench to the intent', () => {
    const layout = frameLayout({
      ...input,
      width: 1856,
      workbenchIntent: 'hidden',
      workbenchPopover: true,
    });

    expect(layout.workbench).toMatchObject({ state: 'hidden', fits: true });
  });

  it('opens over the content as a popover where the page cannot hold it', () => {
    const layout = frameLayout({
      ...input,
      inspectorState: 'open',
      workbenchPopover: true,
    });

    expect(layout.page).toEqual({ offset: 384, width: 688, hidden: false });
    expect(layout.workbench).toEqual({
      state: 'overlay',
      offset: 752,
      width: 312,
      fits: false,
    });
    expect(layout.workbench.offset + layout.workbench.width).toBeLessThan(
      layout.inspector.offset,
    );
  });

  it("overlays the content's trailing edge with the Inspector closed", () => {
    const layout = frameLayout({
      ...input,
      width: 900,
      workbenchPopover: true,
    });

    expect(layout.page).toEqual({ offset: 72, width: 828, hidden: false });
    expect(layout.workbench).toEqual({
      state: 'overlay',
      offset: 580,
      width: 312,
      fits: false,
    });
  });
});
