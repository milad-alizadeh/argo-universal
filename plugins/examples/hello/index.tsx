import {
  Button,
  ActionList,
  Action,
  ListItem,
  Stack,
  Text,
  Pill,
  useEffect,
  useState,
  type Argo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { HelloDashboard } from './dashboard';
import { HelloForm } from './form';
import { registerBuilds } from './list-detail';
import { HelloListPage } from './lists';
import { helloMedia } from './media.js';
import { HelloRunsPage } from './runs.js';

const headingRole = 'heading';

let settings: Argo['settings'] | undefined;

function Buttons({ onTap }: { onTap: () => void }): JSX.Element {
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

// Read on each open, so a changed setting shows the next time the page opens.
function useGreeting(): string {
  const [greeting, setGreeting] = useState('Hello from a Plugin');

  useEffect(() => {
    void settings?.get('greeting').then((value) => {
      if (typeof value === 'string' && value) setGreeting(value);
    });
  }, []);

  return greeting;
}

function HelloPage(): JSX.Element {
  const [taps, setTaps] = useState(0);
  const greeting = useGreeting();

  return (
    <Stack direction="column" gap={4}>
      <Text role={headingRole}>{greeting}</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <ExampleBadges />
      <Buttons onTap={() => setTaps(taps + 1)} />
    </Stack>
  );
}

function ExampleBadges(): JSX.Element {
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

const greeting = (projectId: string, waves: number): string =>
  waves === 0
    ? `Hello from ${projectId}`
    : `Waved at ${projectId} ${waves} times`;

// Project details' Slot: `context` is frozen and holds only the Project id.
type SlotProps = { context: { projectId: string } };

function ProjectDetails({ context }: SlotProps): JSX.Element {
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

export function register(argo: Argo): void {
  settings = argo.settings;
  argo.pages.register('/', HelloPage);
  argo.pages.register('/lists', HelloListPage);
  argo.pages.register('/dashboard', HelloDashboard);
  argo.pages.register('/form', HelloForm);
  registerBuilds(argo.pages);
  argo.pages.register('/media', helloMedia(argo.assets));
  argo.pages.register('/runs', HelloRunsPage);
  argo.slots.register('argo/project/details/v1', ProjectDetails);
}
