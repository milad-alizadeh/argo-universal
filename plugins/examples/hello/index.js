import {
  Button,
  ActionList,
  Action,
  List,
  ListItem,
  Label,
  Stack,
  Page,
  Text,
  Pill,
  useEffect,
  useState,
} from '@argo/plugin-kit';
import { HelloCanvasPage } from './canvas.js';
import { HelloDashboard } from './dashboard.js';
import { HelloForm } from './form.js';
import { registerBuilds } from './list-detail.js';
import { helloMedia } from './media.js';
import { HelloRunsPage } from './runs.js';

const headingRole = 'heading';

let settings;

function Buttons({ onTap }) {
  return (
    <ActionList>
      <ActionList.Section>
        <Action label="Tap me" icon="add" onPress={onTap} />
        <Action
          label="Say hi"
          icon="agent"
          onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
        />
      </ActionList.Section>
    </ActionList>
  );
}

function HelloPage() {
  const [taps, setTaps] = useState(0);
  const [greeting, setGreeting] = useState('Hello from a Plugin');

  // Read on each open, so a changed setting shows the next time the page opens.
  useEffect(() => {
    void settings.get('greeting').then((value) => value && setGreeting(value));
  }, []);

  return (
    <Stack direction="column" gap={4}>
      <Text role={headingRole}>{greeting}</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <ExampleBadges />
      <Buttons onTap={() => setTaps(taps + 1)} />
    </Stack>
  );
}

function ExampleBadges() {
  return (
    <>
      <Pill text="Healthy" tone="success" />
      <ListItem
        title="Waiting jobs"
        badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
      />
    </>
  );
}

const firstBuilds = [
  { id: 'web', title: 'Deploy web' },
  { id: 'native', title: 'Build native' },
];

const nextBuild = (builds) => ({
  id: `build-${builds.length + 1}`,
  title: `Build ${builds.length + 1}`,
});

const buildMeta = (
  <>
    <Pill text="Healthy" tone="success" />
    <Label
      text="2/5 jobs"
      icon={{ sf: 'checkmark.circle', material: 'check_circle' }}
    />
  </>
);

function BuildRow({ build, selected, onSelect }) {
  return (
    <ListItem
      title={build.title}
      subtitle="main"
      selected={selected === build.id}
      onPress={() => onSelect(build.id)}
      meta={buildMeta}
      badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
      progress={{ value: 0.4, tone: 'success', active: true }}
    />
  );
}

const renderBuild = (selected, onSelect) => (build) => (
  <BuildRow
    key={build.id}
    build={build}
    selected={selected}
    onSelect={onSelect}
  />
);

// The page's one main Action: Android's FAB, a header button everywhere else.
const addBuild = (builds, setBuilds) => (
  <Action
    key="add"
    label="Add build"
    icon="add"
    onPress={() => setBuilds([...builds, nextBuild(builds)])}
  />
);

function HelloListPage() {
  const [selected, setSelected] = useState('');
  const [builds, setBuilds] = useState(firstBuilds);

  return (
    <Page title="Hello lists" primaryAction={addBuild(builds, setBuilds)}>
      <List
        appearance="cards"
        items={builds}
        renderItem={renderBuild(selected, setSelected)}
      />
    </Page>
  );
}

const greeting = (projectId, waves) =>
  waves === 0
    ? `Hello from ${projectId}`
    : `Waved at ${projectId} ${waves} times`;

// Project details' Slot: `context` is frozen and holds only the Project id.
function ProjectDetails({ context }) {
  const [waves, setWaves] = useState(0);

  return (
    <Stack direction="column" gap={2}>
      <Text>{greeting(context.projectId, waves)}</Text>
      <Button
        label="Wave"
        variant="outline"
        onPress={() => setWaves(waves + 1)}
      />
    </Stack>
  );
}

export function register(argo) {
  settings = argo.settings;
  argo.pages.register('/', HelloPage);
  argo.pages.register('/lists', HelloListPage);
  argo.pages.register('/dashboard', HelloDashboard);
  argo.pages.register('/form', HelloForm);
  registerBuilds(argo.pages);
  argo.pages.register('/media', helloMedia(argo.assets));
  argo.pages.register('/runs', HelloRunsPage);
  argo.pages.register('/canvas', HelloCanvasPage);
  argo.slots.register('argo/project/details/v1', ProjectDetails);
}
