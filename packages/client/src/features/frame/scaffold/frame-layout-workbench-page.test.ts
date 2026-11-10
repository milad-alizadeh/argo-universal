import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('the Workbench drawn over the page', () => {
  it('sits in the gutter beside the Inspector', () => {
    const layout = frameLayout({
      ...input,
      width: 2224,
      inspectorState: 'open',
    });

    expect(layout.workbench).toEqual({
      state: 'gutter',
      offset: 1536,
      width: 312,
    });
    expect(layout.inspector.offset - 16).toBe(
      layout.workbench.offset + layout.workbench.width,
    );
  });

  it('takes no width from the page wherever it is drawn', () => {
    for (const workbenchIntent of ['auto', 'shown', 'hidden'] as const)
      expect(frameLayout({ ...input, workbenchIntent }).page).toEqual({
        offset: 384,
        width: 1056,
        hidden: false,
      });
  });
});
