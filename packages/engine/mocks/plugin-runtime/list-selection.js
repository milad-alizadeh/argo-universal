import { List, ListItem, Label, Pill } from '@argo/plugin-kit';

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

function BuildRow({ build, selected, to }) {
  return (
    <ListItem
      title={build.title}
      subtitle="main"
      selected={selected === build.id}
      onPress={to.set({ selected: build.id })}
      meta={buildMeta}
      badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
      progress={{ value: 0.4, tone: 'success', active: true }}
    />
  );
}

const renderBuild = (selected, to) => (build) => (
  <BuildRow key={build.id} build={build} selected={selected} to={to} />
);

export function register(argo) {
  argo.pages.define('/lists', {
    state: { selected: '' },
    load: ({ state }) => state.selected,
    render: (selected, to) => (
      <List
        appearance="cards"
        items={builds}
        renderItem={renderBuild(selected, to)}
      />
    ),
  });
}
