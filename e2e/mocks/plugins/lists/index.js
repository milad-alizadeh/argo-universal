import { List, ListItem, Label, Pill } from '@argo/plugin-kit';
import { defineIssues } from './issues.js';

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

// The selected build is Page state, so a press draws the list again with that row selected.
const buildRow = (selected, to) => (build) => (
  <ListItem
    key={build.id}
    title={build.title}
    subtitle="main"
    selected={selected === build.id}
    onPress={to.set({ selected: build.id })}
    meta={buildMeta}
    badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
    progress={{ value: 0.4, tone: 'success', active: true }}
  />
);

export function register(argo) {
  argo.pages.define('/lists', {
    state: { selected: '' },
    load: () => builds,
    render: (items, to, { state }) => (
      <List appearance="cards">{items.map(buildRow(state.selected, to))}</List>
    ),
  });
  defineIssues(argo.pages);
}
