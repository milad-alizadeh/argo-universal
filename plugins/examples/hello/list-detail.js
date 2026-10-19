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
    running: 'Deploying main to production: 2 of 5 jobs done.',
    cancelled: 'Cancelled. Rerun to deploy main again.',
  },
  {
    id: 'native',
    title: 'Build native',
    running: 'Building the iOS and Android apps: 2 of 5 jobs done.',
    cancelled: 'Cancelled. Rerun to build the apps again.',
  },
];

// The list's own path; each build's page sits below it, as `/builds/web`.
const listPath = '/builds';

// A Plugin opens its pages by their full App path: the Plugin id, the nav id, then its own path.
const buildHref = (build) =>
  `/plugins/hello/hello-builds${listPath}/${build.id}`;

const buildMetadata = (
  <Metadata>
    <Metadata.StatusDot title="Status" text="Running" tone="info" />
    <Metadata.Avatar title="Started by" name="Ana Ruiz" />
    <Metadata.Pills title="Branch">
      <Pill text="main" />
    </Metadata.Pills>
    <Metadata.Label title="Started" text="2 minutes ago" />
    <Metadata.Link
      title="Docs"
      text="example.com"
      href="https://example.com/hello"
    />
  </Metadata>
);

function CancelAction({ cancelled, onToggle }) {
  return (
    <ActionList>
      <Action
        label={cancelled ? 'Rerun' : 'Cancel'}
        icon="check"
        onPress={onToggle}
      />
    </ActionList>
  );
}

// A build's page: its progress, with Metadata beside it on wide screens.
function BuildPage({ build }) {
  const [cancelled, setCancelled] = useState(false);
  const toggle = () => setCancelled(!cancelled);

  return (
    <Page title={build.title}>
      <Detail
        markdown={cancelled ? build.cancelled : build.running}
        metadata={buildMetadata}
        actions={<CancelAction cancelled={cancelled} onToggle={toggle} />}
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
        <BuildRow
          key={build.id}
          build={build}
          selected={build.id === selected?.id}
        />
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
