import {
  Action,
  Label,
  List,
  ListItem,
  Screen,
  Pill,
  useState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

const firstBuilds = [
  { id: 'web', title: 'Deploy web' },
  { id: 'native', title: 'Build native' },
];

type Build = (typeof firstBuilds)[number];

const nextBuild = (builds: Build[]): Build => ({
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

type Select = (id: string) => void;

type BuildRowProps = { build: Build; selected: string; onSelect: Select };

function BuildRow({ build, selected, onSelect }: BuildRowProps): JSX.Element {
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

const renderBuild =
  (selected: string, onSelect: Select) =>
  (build: Build): JSX.Element => (
    <BuildRow
      key={build.id}
      build={build}
      selected={selected}
      onSelect={onSelect}
    />
  );

// The page's one main Action: Android's FAB, a header button everywhere else.
const addBuild = (
  builds: Build[],
  setBuilds: (builds: Build[]) => void,
): JSX.Element => (
  <Action
    key="add"
    label="Add build"
    icon="add"
    onPress={() => setBuilds([...builds, nextBuild(builds)])}
  />
);

export function HelloListPage(): JSX.Element {
  const [selected, setSelected] = useState('');
  const [builds, setBuilds] = useState(firstBuilds);

  return (
    <Screen title="Hello lists" primaryAction={addBuild(builds, setBuilds)}>
      <List
        appearance="cards"
        items={builds}
        renderItem={renderBuild(selected, setSelected)}
      />
    </Screen>
  );
}
