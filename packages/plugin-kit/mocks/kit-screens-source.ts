// A Plugin mounted through the kit the way a real one is: pages register, the Engine draws them, a dispatch patches them.
export const kitScreensSource = `import { Action, Button, Card, Detail, EmptyState, FieldGroup, Grid, List, ListDetail, ListItem, Metadata, Screen, SegmentedControl, Stack, Text, useState } from '@argo/plugin-kit';

function Views() {
  const [view, setView] = useState('open');
  return (
    <Screen title="Issue views">
      <Stack direction="column" gap={4}>
        <SegmentedControl label="Issue view" options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} value={view} onValueChange={setView} />
        <Text>{view === 'open' ? 'Open Issue' : 'Closed Issue'}</Text>
      </Stack>
    </Screen>
  );
}

function Lists() {
  const [builds, setBuilds] = useState([{ id: 'web', title: 'Deploy web' }]);
  const add = () => setBuilds([...builds, { id: 'b' + builds.length, title: 'Build ' + (builds.length + 1) }]);
  return (
    <Screen title="Lists" primaryAction={<Action key="add" label="Add build" icon="add" onPress={add} />}>
      <List appearance="cards" items={builds} renderItem={(build) => <ListItem key={build.id} title={build.title} />} />
    </Screen>
  );
}

function Dashboard() {
  return (
    <Screen title="Dashboard">
      <Stack direction="column" gap={4}>
        <Text role="heading">Issues</Text>
        <Grid columns={{ compact: 2, medium: 2, wide: 3 }} gap={3}>
          {['Open', 'Blocked'].map((title) => <Card key={title} title={title}><Text>1</Text></Card>)}
        </Grid>
      </Stack>
    </Screen>
  );
}

function Form() {
  const [draft, setDraft] = useState({ title: '', labels: [], due: undefined });
  const [saved, setSaved] = useState('');
  return (
    <Screen title="New Issue">
      <FieldGroup>
        <FieldGroup.Section>
          <FieldGroup.TextField title="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
          <FieldGroup.Picker title="Labels" presentation="menu" multiple options={[{ value: 'bug', label: 'Bug' }, { value: 'docs', label: 'Docs' }]} value={draft.labels} onValueChange={(labels) => setDraft({ ...draft, labels })} />
          <FieldGroup.DatePicker title="Due" value={draft.due} onValueChange={(due) => setDraft({ ...draft, due })} />
        </FieldGroup.Section>
      </FieldGroup>
      <Stack direction="column" gap={2}>
        <Button label="Create Issue" onPress={() => setSaved(draft.title + ' ' + draft.labels.join() + ' ' + draft.due)} />
        {saved ? <Text>{'Created ' + saved}</Text> : null}
      </Stack>
    </Screen>
  );
}

function Build({ selected }) {
  const [cancelled, setCancelled] = useState(false);
  return (
    <Screen title="Build web" actions={<Action label={cancelled ? 'Rerun' : 'Cancel'} icon="check" onPress={() => setCancelled(!cancelled)} />}>
      <Detail markdown="Deploying" metadata={<Metadata><Metadata.StatusDot title="Status" text="Running" tone="info" /></Metadata>} />
    </Screen>
  );
}

function Builds({ selected }) {
  return (
    <ListDetail
      list={<List appearance="cards" items={[{ id: 'web', title: 'Deploy web' }]} renderItem={(build) => <ListItem key={build.id} title={build.title} selected={selected} onPress={{ action: 'navigate', path: '/builds/web' }} />} />}
      detail={selected ? <Build /> : undefined}
      empty={<EmptyState title="Select a build" description="Choose a build from the list." />}
    />
  );
}

function Demos() {
  return (
    <Screen title="Demos">
      <Card title="Builds" onPress={{ action: 'navigate', path: '/builds' }} />
    </Screen>
  );
}

export function register(argo) {
  argo.pages.register('/', Demos);
  argo.pages.register('/views', Views);
  argo.pages.register('/lists', Lists);
  argo.pages.register('/dashboard', Dashboard);
  argo.pages.register('/form', Form);
  argo.pages.register('/builds', () => <Builds />);
  argo.pages.register('/builds/web', () => <Builds selected />);
}`;
