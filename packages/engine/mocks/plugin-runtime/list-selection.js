import { List, ListItem, Label, Pill, useState } from '@argo/plugin-kit';

const builds = [
  { id: 'web', title: 'Deploy web' },
  { id: 'native', title: 'Build native' },
];

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

function HelloListPage() {
  const [selected, setSelected] = useState('');

  return (
    <List
      appearance="cards"
      items={builds}
      renderItem={renderBuild(selected, setSelected)}
    />
  );
}

export function register(argo) {
  argo.pages.register('/lists', HelloListPage);
}
