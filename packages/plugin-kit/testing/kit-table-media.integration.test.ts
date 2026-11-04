import { expect, it } from 'vitest';
import {
  keyOf,
  startKit,
  webSurface as surface,
} from '../mocks/kit-page-helpers';

const source = `import { Audio, Pill, Screen, ScrollView, Stack, Surface, Table, Video, useState } from '@argo/plugin-kit';

const columns = [
  { id: 'workflow', title: 'Workflow' },
  { id: 'started', title: 'Started', sortable: true },
];

const runs = [
  { id: 'typecheck', workflow: 'Typecheck', order: 1 },
  { id: 'build', workflow: 'Build iOS', order: 2 },
  { id: 'lint', workflow: 'Lint', order: 3 },
];

function Runs() {
  const [sort, setSort] = useState({ column: 'started', direction: 'ascending' });
  const order = sort.direction === 'ascending' ? 1 : -1;
  return (
    <Screen title="Runs">
      <Table
        accessibilityLabel="CI runs"
        columns={columns}
        sort={sort}
        onSortChange={setSort}
        items={runs.toSorted((a, b) => order * (a.order - b.order))}
        renderItem={(run) => (
          <Table.Row key={run.id} id={run.id}>
            <Table.Cell column="workflow" text={run.workflow}><Pill text="Passed" tone="success" /></Table.Cell>
            <Table.Cell column="started" text={'Run ' + run.order} />
          </Table.Row>
        )}
      />
    </Screen>
  );
}

// The media's Server references, resolved before the page draws.
const resolveMedia = async (assets) => {
  const [clip, poster, chime] = await Promise.all([
    assets.resolve({ asset: 'assets/clip.mp4' }),
    assets.resolve({ asset: 'assets/poster.jpeg' }),
    assets.resolve({ asset: 'assets/chime.mp3' }),
  ]);
  return { clip, poster, chime };
};

const media = ({ clip, poster, chime }) => (
  <ScrollView>
    <Surface kind="background" padding={4}>
      <Stack direction="column" gap={4}>
        <Video source={clip} poster={poster} accessibilityLabel="Clip" />
        <Audio source={chime} accessibilityLabel="Chime" />
      </Stack>
    </Surface>
  </ScrollView>
);

// The runs table stays a mounted page: a Loader page cannot yet take a sort's payload.
export function register(argo) {
  argo.pages.register('/runs', Runs);
  argo.pages.define('/media', { load: () => resolveMedia(argo.assets), render: media });
}`;

const start = (): ReturnType<typeof startKit> =>
  startKit(source, ['clip.mp4', 'poster.jpeg', 'chime.mp3']);

it('sorts a table of runs when Argo reports the new sort', async () => {
  const kit = await start();
  const page = await kit.mount({ page: '/runs', surface });
  expect((await page.find('CI runs')).type).toBe('Table');
  expect((await page.find('Build iOS')).type).toBe('Table.Cell');

  const firstRun = (): string =>
    JSON.stringify(page.findText('CI runs')?.node.children[0]?.props.id);

  expect(firstRun()).toBe('"typecheck"');
  await page.dispatch({
    key: keyOf(page, 'CI runs'),
    event: 'onSortChange',
    payload: { column: 'started', direction: 'descending' },
  });
  await page.waitFor(() => firstRun() === '"lint"');
});

it('plays a clip and a sound named by the Server reference, not a Plugin host', async () => {
  const kit = await start();
  const page = await kit.pages.open({ path: '/media' });
  const clip = page.find('Clip');
  const chime = page.find('Chime');
  expect(clip.type).toBe('Video');
  expect(Object.keys(clip.props.source ?? {}).toSorted()).toEqual([
    'format',
    'hash',
    'pluginId',
  ]);
  expect(clip.props).toMatchObject({
    source: { format: 'mp4' },
    poster: { format: 'jpeg' },
  });
  expect(chime.type).toBe('Audio');
  expect(chime.props).toMatchObject({ source: { format: 'mp3' } });
});
