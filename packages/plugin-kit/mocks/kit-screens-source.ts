// A Plugin drawn through the kit the way a real one is: its Loader pages define, the Engine draws them, and a press acts on what the tree holds.
export const kitScreensSource = `import { Action, Button, Card, Detail, EmptyState, FieldGroup, Grid, List, ListDetail, ListItem, Metadata, Screen, SegmentedControl, Stack, Text } from '@argo/plugin-kit';

const views = (view, to) => (
  <Screen title="Issue views">
    <Stack direction="column" gap={4}>
      <SegmentedControl label="Issue view" options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} value={view} onValueChange={to.bind('view')} />
      <Text>{view === 'open' ? 'Open Issue' : 'Closed Issue'}</Text>
    </Stack>
  </Screen>
);

const buildsOf = (count) => Array.from({ length: count }, (_, index) => index === 0 ? { id: 'web', title: 'Deploy web' } : { id: 'b' + index, title: 'Build ' + (index + 1) });

const lists = (count, to) => (
  <Screen title="Lists" primaryAction={<Action key="add" label="Add build" icon="add" onPress={to.set({ builds: count + 1 })} />}>
    <List appearance="cards">{buildsOf(count).map((build) => <ListItem key={build.id} title={build.title} />)}</List>
  </Screen>
);

const dashboard = (
  <Screen title="Dashboard">
    <Stack direction="column" gap={4}>
      <Text role="heading">Issues</Text>
      <Grid columns={{ compact: 2, medium: 2, wide: 3 }} gap={3}>
        {['Open', 'In progress', 'Done', 'Blocked'].map((title) => <Card key={title} title={title}><Text>1</Text></Card>)}
      </Grid>
    </Stack>
  </Screen>
);

// The draft is Page state: each field binds its key, and Create Issue saves the title the page drew with.
const form = (state, to) => (
  <Screen title="New Issue">
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.TextField title="Title" value={state.title} onChangeText={to.bind('title')} />
        <FieldGroup.Picker title="Labels" presentation="menu" multiple options={[{ value: 'bug', label: 'Bug' }, { value: 'docs', label: 'Docs' }]} value={state.labels} onValueChange={to.bind('labels')} />
        <FieldGroup.DatePicker title="Due" value={state.due || undefined} onValueChange={to.bind('due')} />
      </FieldGroup.Section>
    </FieldGroup>
    <Stack direction="column" gap={2}>
      <Button label="Create Issue" onPress={to.set({ saved: state.title })} />
      {state.saved ? <Text>{'Created ' + state.saved}</Text> : null}
    </Stack>
  </Screen>
);

const build = (cancelled, to) => (
  <Screen title="Build web" actions={<Action label={cancelled ? 'Rerun' : 'Cancel'} icon="check" onPress={to.set({ cancelled: !cancelled })} />} aside={<Metadata><Metadata.StatusDot title="Status" text="Running" tone="info" /></Metadata>}>
    <Detail markdown="Deploying" />
  </Screen>
);

const buildRows = [{ id: 'web', title: 'Deploy web' }, { id: 'native', title: 'Build native' }];

const builds = (detail, to) => (
  <ListDetail
    list={<List appearance="cards">{buildRows.map((row) => <ListItem key={row.id} title={row.title} selected={detail !== undefined && row.id === 'web'} onPress={to.go('/builds/' + row.id)} />)}</List>}
    detail={detail}
    empty={<EmptyState title="Select a build" description="Choose a build from the list." />}
  />
);

const demos = (to) => (
  <Screen title="Demos">
    {['Lists', 'Dashboard', 'Form', 'Builds'].map((title) => <Card key={title} title={title} onPress={to.go('/' + title.toLowerCase())} />)}
  </Screen>
);

const none = () => null;

export function register(argo) {
  argo.pages.define('/', { load: none, render: (_data, to) => demos(to) });
  argo.pages.define('/views', { state: { view: 'open' }, load: none, render: (_data, to, { state }) => views(state.view, to) });
  argo.pages.define('/lists', { state: { builds: 1 }, load: none, render: (_data, to, { state }) => lists(state.builds, to) });
  argo.pages.define('/dashboard', { load: none, render: () => dashboard });
  argo.pages.define('/form', { state: { title: '', labels: [], due: '', saved: '' }, load: none, render: (_data, to, { state }) => form(state, to) });
  argo.pages.define('/builds', { load: none, render: (_data, to) => builds(undefined, to) });
  argo.pages.define('/builds/web', { state: { cancelled: false }, load: none, render: (_data, to, { state }) => builds(build(state.cancelled, to), to) });
}`;
