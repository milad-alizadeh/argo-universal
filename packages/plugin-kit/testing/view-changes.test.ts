import { describe, expect, it } from 'vitest';
import { ViewChanges } from './view-changes';

describe('view changes', () => {
  it('keeps waiting, with no deadline of its own, until the change is announced', async () => {
    const changes = new ViewChanges();
    let held = false;

    const waited = changes.until(
      () => held,
      () => new Error('closed'),
    );

    changes.announce();
    changes.announce();
    held = true;
    changes.announce();

    await expect(waited).resolves.toBeUndefined();
  });

  it('fails as soon as the stream ends without the condition holding', async () => {
    const changes = new ViewChanges();

    const waited = changes.until(
      () => false,
      () => new Error('closed early'),
    );

    changes.end();

    await expect(waited).rejects.toThrow('closed early');
  });

  it('still passes when the condition held before the stream ended', async () => {
    const changes = new ViewChanges();
    changes.end();

    await expect(
      changes.until(
        () => true,
        () => new Error('unreachable'),
      ),
    ).resolves.toBeUndefined();
  });
});
