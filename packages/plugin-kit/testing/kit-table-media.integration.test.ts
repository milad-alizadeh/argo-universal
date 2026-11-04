import type { WireJson } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startKit } from '../mocks/kit-page-helpers';

const source = `import { Audio, Pill, Screen, ScrollView, Stack, Surface, Table, Video } from '@argo/plugin-kit';

const columns = [
  { id: 'workflow', title: 'Workflow' },
  { id: 'started', title: 'Started', sortable: true },
];

const runs = [
  { id: 'typecheck', workflow: 'Typecheck', order: 1 },
  { id: 'build', workflow: 'Build iOS', order: 2 },
  { id: 'lint', workflow: 'Lint', order: 3 },
];

// The sort is Page state, two flat keys the Table's sort fills in, so the page draws again at the new address.
const runsPage = ({ sortColumn, sortDirection }, to) => {
  const order = sortDirection === 'ascending' ? 1 : -1;
  return (
    <Screen title="Runs">
      <Table
        accessibilityLabel="CI runs"
        columns={columns}
        sort={{ column: sortColumn, direction: sortDirection }}
        onSortChange={to.set({ sortColumn: to.payload('column'), sortDirection: to.payload('direction') })}
      >
        {runs.toSorted((a, b) => order * (a.order - b.order)).map((run) => (
          <Table.Row key={run.id} id={run.id}>
            <Table.Cell column="workflow" text={run.workflow}><Pill text="Passed" tone="success" /></Table.Cell>
            <Table.Cell column="started" text={'Run ' + run.order} />
          </Table.Row>
        ))}
      </Table>
    </Screen>
  );
};

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

export function register(argo) {
  argo.pages.define('/runs', {
    state: { sortColumn: 'started', sortDirection: 'ascending' },
    load: () => null,
    render: (_data, to, { state }) => runsPage(state, to),
  });
  argo.pages.define('/media', { load: () => resolveMedia(argo.assets), render: media });
}`;

const start = (): ReturnType<typeof startKit> =>
  startKit(source, ['clip.mp4', 'poster.jpeg', 'chime.mp3']);

it('sorts a table of runs into Page state from the sort the Table reports', async () => {
  const kit = await start();
  const page = await kit.pages.open({ path: '/runs' });
  expect(page.find('CI runs').type).toBe('Table');
  expect(page.find('Build iOS').type).toBe('Table.Cell');

  const firstRun = (): WireJson | undefined =>
    page.find('CI runs').children[0]?.props.id;

  expect(firstRun()).toBe('typecheck');
  await page.act('CI runs', 'onSortChange', {
    column: 'started',
    direction: 'descending',
  });
  expect(page.pageState).toEqual({
    sortColumn: 'started',
    sortDirection: 'descending',
  });
  expect(firstRun()).toBe('lint');
  expect(page.find('CI runs').props.sort).toEqual({
    column: 'started',
    direction: 'descending',
  });
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
