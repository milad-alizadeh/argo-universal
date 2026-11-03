import { drawsNothing } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startKit, webSurface as surface } from '../mocks/kit-page-helpers';

/*
 * A Plugin says a card has nothing to show by drawing nothing (ADR-0035). Argo reads that from the tree alone, so a
 * page that returns `null` must reach it as nothing, and a page of one component, which has no children, must not.
 */
const source = `import { Button, Stack, Text, useEffect, useState } from '@argo/plugin-kit';

let filled = false;
const listeners = new Set();

function Filled() {
  const [shown, setShown] = useState(filled);
  useEffect(() => {
    const listener = () => setShown(filled);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  return shown ? <Text>Something to show</Text> : null;
}

function Fill() {
  const toggle = () => {
    filled = !filled;
    for (const listener of listeners) listener();
  };
  return <Button label="Fill" onPress={toggle} />;
}

export function register(argo) {
  argo.pages.register('/nothing', () => null);
  argo.pages.register('/empty-stack', () => <Stack direction="column" />);
  argo.pages.register('/one-text', () => <Text>One line</Text>);
  argo.pages.register('/stacked', () => <Stack direction="column"><Text>In a stack</Text></Stack>);
  argo.pages.register('/filled', () => <Filled />);
  argo.pages.register('/fill', () => <Fill />);
}
`;

type Kit = Awaited<ReturnType<typeof startKit>>;

const drawn = async (kit: Kit, page: string): Promise<boolean> => {
  const view = await kit.mount({ page, surface });

  await view.ready();

  return !drawsNothing(view.tree);
};

it('reads a page that returns null, or an empty Stack, as drawing nothing', async () => {
  const kit = await startKit(source);

  expect(await drawn(kit, '/nothing')).toBe(false);
  expect(await drawn(kit, '/empty-stack')).toBe(false);
}, 20_000);

it('reads a page of one component, or a Stack holding one, as drawing something', async () => {
  const kit = await startKit(source);

  expect(await drawn(kit, '/one-text')).toBe(true);
  expect(await drawn(kit, '/stacked')).toBe(true);
}, 20_000);

// A card page that starts with nothing, and the page whose button fills and empties it.
const fillable = async (): Promise<{
  card: Awaited<ReturnType<Kit['mount']>>;
  fill: Awaited<ReturnType<Kit['mount']>>;
}> => {
  const kit = await startKit(source);
  const card = await kit.mount({ page: '/filled', surface });
  const fill = await kit.mount({ page: '/fill', surface });

  await card.ready();

  return { card, fill };
};

it('draws something once the page has it', async () => {
  const { card, fill } = await fillable();

  await fill.press('Fill');

  await card.waitFor(() => !drawsNothing(card.tree), 'the page filled');
  expect(card.findText('Something to show')).toBeDefined();
}, 20_000);

it('draws nothing again once what the page had is gone', async () => {
  const { card, fill } = await fillable();

  await fill.press('Fill');
  await card.waitFor(() => !drawsNothing(card.tree), 'the page filled');
  await fill.press('Fill');

  await card.waitFor(() => drawsNothing(card.tree), 'the page emptied');
  expect(card.findText('Something to show')).toBeUndefined();
}, 20_000);
