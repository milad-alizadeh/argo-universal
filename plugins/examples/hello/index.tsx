import {
  Button,
  Markdown,
  Code,
  Link,
  Action,
  Screen,
  ListItem,
  Stack,
  Text,
  Pill,
  useEffect,
  useState,
  type Argo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { HelloCanvasPage } from './canvas';
import { HelloDashboard } from './dashboard';
import { HelloForm } from './form';
import { helloGallery } from './gallery';
import { registerBuilds } from './list-detail';
import { HelloListPage } from './lists';
import { helloMedia } from './media';
import { HelloRunsPage } from './runs';

const headingRole = 'heading';

let settings: Argo['settings'];

// The Screen's header Actions: a Screen declares its verbs as props, content cannot add them.
function buttons(onTap: () => void): JSX.Element {
  return (
    <Action.Section>
      <Action label="Tap me" icon="add" onPress={onTap} />
      <Action
        label="Say hi"
        icon="agent"
        onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
      />
    </Action.Section>
  );
}

// Read on each open, so a changed setting shows the next time the page opens.
function useGreeting(): string {
  const [greeting, setGreeting] = useState('Hello from a Plugin');

  useEffect(() => {
    // A setting is text or a switch; the greeting is text.
    void settings
      .get('greeting')
      .then((value) => value && setGreeting(String(value)));
  }, []);

  return greeting;
}

type ContentProps = { greeting: string; taps: number };

function HelloContent({ greeting, taps }: ContentProps): JSX.Element {
  return (
    <Stack direction="column" gap={4}>
      <Text role={headingRole}>{greeting}</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <ExampleBadges />
      <Markdown text="## Hello kit\n\nShared **Markdown** content." />
      <Code code="const greeting = 'Hello';" language="ts" />
      <Link label="Example website" href="https://example.com" />
    </Stack>
  );
}

function HelloPage(): JSX.Element {
  const [taps, setTaps] = useState(0);
  const greeting = useGreeting();

  return (
    <Screen title="Hello" actions={buttons(() => setTaps(taps + 1))}>
      <HelloContent greeting={greeting} taps={taps} />
    </Screen>
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
  registerMediaPages(argo);
  argo.pages.register('/runs', HelloRunsPage);
  argo.pages.register('/canvas', HelloCanvasPage);
  argo.slots.register('argo/project/details/v1', ProjectDetails);
}

function registerMediaPages(argo: Argo): void {
  argo.pages.register('/media', helloMedia(argo.assets));
  argo.pages.register('/gallery', helloGallery(argo.assets));
}
