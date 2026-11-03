import { expect, it } from 'vitest';
import { issueTitle, refusedTitle, signedIn, wait } from './journey-fixture';

const web = { platform: 'web' } as const;

// Each page is opened straight from its link, as a reload or a link from outside the Plugin opens it, before any list drew a row for it.
it('opens an Issue no list has shown and no Session is attached to', async () => {
  const { test } = await signedIn();

  const page = await test.mount({
    page: '/projects/project-1/issues/43',
    surface: web,
  });

  await expect.poll(() => page.findText(refusedTitle), wait).toBeDefined();
}, 30_000);

it('opens a label filter no list has shown', async () => {
  const { test } = await signedIn();

  const page = await test.mount({
    page: '/projects/project-1/filters/label-good_20_first_20_issue',
    surface: web,
  });

  // The page draws the label's Issues; the section's one list beside it marks its row.
  await expect
    .poll(() => page.tree?.props.title, wait)
    .toBe('good first issue');
  await expect.poll(() => page.findText(issueTitle), wait).toBeDefined();
}, 30_000);

it("says an Issue path that names no Issue doesn't exist", async () => {
  const { test } = await signedIn();

  const page = await test.mount({
    page: '/projects/project-1/issues/not-a-number',
    surface: web,
  });

  await expect
    .poll(() => page.findText("This page doesn't exist"), wait)
    .toBeDefined();
}, 30_000);
