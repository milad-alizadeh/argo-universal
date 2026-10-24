import {
  Action,
  Detail,
  EmptyState,
  Label,
  ListDetail,
  List,
  ListItem,
  Metadata,
  Screen,
  Pill,
  useState,
  type Argo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

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

type Build = (typeof buildItems)[number];

// The list's own path; each build's page sits below it, as `/builds/web`.
const listPath = '/builds';

// A Plugin opens its pages by their full App path: the Plugin id, the nav id, then its own path.
const buildHref = (build: Build): string =>
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

type CancelProps = { cancelled: boolean; onToggle: () => void };

function CancelAction({ cancelled, onToggle }: CancelProps): JSX.Element {
  return (
    <Action
      label={cancelled ? 'Rerun' : 'Cancel'}
      icon="check"
      onPress={onToggle}
    />
  );
}

// A build's page: its progress, with Metadata beside it on wide screens.
function BuildPage({ build }: { build: Build }): JSX.Element {
  const [cancelled, setCancelled] = useState(false);
  const toggle = (): void => setCancelled(!cancelled);

  return (
    <Screen
      title={build.title}
      actions={<CancelAction cancelled={cancelled} onToggle={toggle} />}
    >
      <Detail
        markdown={cancelled ? build.cancelled : build.running}
        metadata={buildMetadata}
      />
    </Screen>
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

type BuildRowProps = { build: Build; selected: boolean };

function BuildRow({ build, selected }: BuildRowProps): JSX.Element {
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

type Selection = { selected?: Build };

function BuildList({ selected }: Selection): JSX.Element {
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
function BuildsListDetail({ selected }: Selection): JSX.Element {
  return (
    <ListDetail
      list={<BuildList selected={selected} />}
      detail={selected ? <BuildPage build={selected} /> : undefined}
      empty={noBuild}
    />
  );
}

const buildPage = (build: Build): (() => JSX.Element) =>
  function HelloBuildPage(): JSX.Element {
    return <BuildsListDetail selected={build} />;
  };

function HelloBuildsPage(): JSX.Element {
  return <BuildsListDetail />;
}

// The list at its own path, and each build's page below it.
export function registerBuilds(pages: Argo['pages']): void {
  pages.register(listPath, HelloBuildsPage);

  for (const build of buildItems)
    pages.register(`${listPath}/${build.id}`, buildPage(build));
}
