import {
  Action,
  ActionList,
  Detail,
  EmptyState,
  Label,
  ListDetail,
  List,
  ListItem,
  Metadata,
  Page,
  Pill,
  useState,
} from '@argo/plugin-kit';

const buildItems = [
  {
    id: 'web',
    title: 'Deploy web',
    issue: 'Sync fails on large repos',
    open: 'Sync stops after a few minutes on repositories with more than 50,000 files.',
    closed: 'Closed. Sync now fetches large repositories in batches.',
  },
  {
    id: 'native',
    title: 'Build native',
    issue: 'Add CSV export',
    open: 'Export the visible Issues as CSV, with the columns shown.',
    closed: 'Closed. CSV export ships in v1.3.',
  },
];

// The list's own path; each build's page sits below it, as `/builds/web`.
const listPath = '/builds';

// A Plugin opens its pages by their full App path: the Plugin id, the nav id, then its own path.
const buildHref = (build) =>
  `/plugins/hello/hello-builds${listPath}/${build.id}`;

const itemMetadata = (
  <Metadata>
    <Metadata.StatusDot title="Status" text="In progress" tone="info" />
    <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
    <Metadata.Pills title="Labels">
      <Pill text="bug" />
      <Pill text="sync" />
    </Metadata.Pills>
    <Metadata.Label title="Opened" text="2 days ago" />
    <Metadata.Link
      title="Docs"
      text="example.com"
      href="https://example.com/hello"
    />
  </Metadata>
);

function CloseAction({ closed, onToggle }) {
  return (
    <ActionList>
      <Action
        label={closed ? 'Reopen' : 'Close'}
        icon="check"
        onPress={onToggle}
      />
    </ActionList>
  );
}

// An item page: its content, with Metadata beside it on wide screens.
function BuildPage({ build }) {
  const [closed, setClosed] = useState(false);
  const toggle = () => setClosed(!closed);

  return (
    <Page title={build.issue}>
      <Detail
        markdown={closed ? build.closed : build.open}
        metadata={itemMetadata}
        actions={<CloseAction closed={closed} onToggle={toggle} />}
      />
    </Page>
  );
}

const buildMeta = (
  <>
    <Pill text="Healthy" tone="success" />
    <Label
      text="2/5 jobs"
      icon={{ sf: 'checkmark.circle', material: 'check_circle' }}
    />
  </>
);

function BuildRow({ build, selected }) {
  return (
    <ListItem
      title={build.title}
      subtitle="main"
      selected={selected}
      onPress={{ action: 'navigate', path: buildHref(build) }}
      meta={buildMeta}
      badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
      progress={{ value: 0.4, tone: 'success', active: true }}
    />
  );
}

const noBuild = (
  <EmptyState
    title="Select a build"
    description="Choose a build from the list."
  />
);

function BuildList({ selected }) {
  return (
    <List
      appearance="cards"
      items={buildItems}
      renderItem={(build) => (
        <BuildRow key={build.id} build={build} selected={build === selected} />
      )}
    />
  );
}

// The builds beside the selected one; each build's path selects it, so a link opens it at any width.
function BuildsListDetail({ selected }) {
  return (
    <ListDetail
      list={<BuildList selected={selected} />}
      detail={selected ? <BuildPage build={selected} /> : undefined}
      empty={noBuild}
    />
  );
}

const buildPage = (build) =>
  function HelloBuildPage() {
    return <BuildsListDetail selected={build} />;
  };

function HelloBuildsPage() {
  return <BuildsListDetail />;
}

// The list at its own path, and each build's page below it.
export function registerBuilds(pages) {
  pages.register(listPath, HelloBuildsPage);

  for (const build of buildItems)
    pages.register(`${listPath}/${build.id}`, buildPage(build));
}
