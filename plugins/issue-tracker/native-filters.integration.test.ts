import { expect, it } from 'vitest';
import { issueTitle, signedInRoot } from './journey-fixture';

it.each(['ios', 'android'] as const)(
  'draws native navigation rows for Issues filters on %s',
  async (platform) => {
    const { test } = await signedInRoot();
    const page = await test.pages.open({ path: '/', platform });

    expect(page.find('Open').type).toBe('FieldGroup.Link');
    expect(page.find('Open').props.value).toBe('2');
    expect(page.find('good first issue').type).toBe('FieldGroup.Link');
    expect(page.find('Labels').type).toBe('FieldGroup.Value');
  },
  30_000,
);

it.each(['web', 'desktop'] as const)(
  'keeps the existing filter rows on %s',
  async (platform) => {
    const { test } = await signedInRoot();
    const page = await test.pages.open({ path: '/', platform });

    expect(page.find('Open').type).toBe('ListItem');
    expect(page.find('good first issue').type).toBe('ListItem');
  },
  30_000,
);

it.each(['ios', 'android'] as const)(
  'opens an Issue filter from native navigation on %s',
  async (platform) => {
    const { test } = await signedInRoot();
    const page = await test.pages.open({ path: '/', platform });
    const opened = await page.press('Open');

    expect(opened.findText(issueTitle)).toBeDefined();
  },
  30_000,
);
