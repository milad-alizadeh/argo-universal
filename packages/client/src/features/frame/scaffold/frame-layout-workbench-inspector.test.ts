import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('the Workbench placed against the Inspector', () => {
  it('waits under the Inspector, past the page, while it is not drawn', () => {
    const layout = frameLayout({ ...input, inspectorState: 'open' });

    expect(layout.workbench.state).toBe('auto-hidden');
    expect(layout.workbench.offset).toBe(layout.inspector.offset);
  });

  it('never reaches under the Inspector when a drag left the page narrower than a card', () => {
    const layout = frameLayout({
      ...input,
      width: 1440,
      inspectorState: 'open',
      preferredInspectorWidth: 800,
      draggedContentFloor: 240,
      workbenchPopover: true,
    });

    expect(layout.workbench.state).toBe('overlay');
    expect(layout.workbench.offset).toBe(layout.page.offset);
    expect(
      layout.workbench.offset + layout.workbench.width,
    ).toBeLessThanOrEqual(layout.inspector.offset - input.measures.paneGap);
  });
});
