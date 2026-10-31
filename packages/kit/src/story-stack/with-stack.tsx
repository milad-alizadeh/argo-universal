import { ExpoRoot, Stack, useLocalSearchParams } from 'expo-router';
import { use, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Text } from '#primitives/content/text';
import { ScreenNavigationEnabled } from '#primitives/scaffolds/screen';
import { PushedScreenRoute } from '../pushed-screen/routes';
import { StackScreensContext, type StoryScreens } from './stack-story-context';

/*
 * A story's decorator on web: the story is the root of a real expo-router stack held in memory, so its Screen draws the
 * header the App's narrow window does. It takes the story context only to match the phone decorator's signature.
 */
export function withStack(pages: StoryScreens = {}) {
  return function WithStack(
    Story: ComponentType,
    _context?: { id: string },
  ): React.JSX.Element {
    return <MemoryStack Root={Story} pages={pages} />;
  };
}

interface MemoryStackProps {
  Root: ComponentType;
  pages: StoryScreens;
}

function MemoryStack({ Root, pages }: MemoryStackProps): React.JSX.Element {
  // One router per story; a new context would restart it.
  const [context] = useState(routes);
  const screens = useMemo(() => ({ Root, pages }), [Root, pages]);
  useKeepAddress();

  return (
    <StackScreensContext value={screens}>
      <ExpoRoot context={context} location="/" />
    </StackScreensContext>
  );
}

function RootRoute(): React.JSX.Element {
  const { Root } = use(StackScreensContext);

  return (
    <ScreenNavigationEnabled value>
      <Root />
    </ScreenNavigationEnabled>
  );
}

function ScreenRoute(): React.JSX.Element {
  const { pages } = use(StackScreensContext);
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const Component = pages[screen];

  // A name the story registered no page under is an address no route answers, as in the App.
  if (!Component) return <NotFoundRoute />;

  return (
    <ScreenNavigationEnabled value>
      <Component />
    </ScreenNavigationEnabled>
  );
}

// Stands in for the not-found page the App's Frame draws for an address no route answers.
function NotFoundRoute(): React.JSX.Element {
  return <Text>Not found</Text>;
}

function StackLayout(): React.JSX.Element {
  return <Stack />;
}

type ExpoRootContext = React.ComponentProps<typeof ExpoRoot>['context'];

// The expo-router file tree, as a context in memory instead of the App's `app` folder.
function routes(): ExpoRootContext {
  const files = new Map<string, { default: ComponentType }>([
    ['./_layout.js', { default: StackLayout }],
    ['./index.js', { default: RootRoute }],
    ['./screen/[id].js', { default: PushedScreenRoute }],
    ['./[screen].js', { default: ScreenRoute }],
    ['./+not-found.js', { default: NotFoundRoute }],
  ]);

  return Object.assign((key: string) => files.get(key), {
    keys: () => [...files.keys()],
    resolve: (key: string) => key,
    id: 'story-stack',
  });
}

/*
 * The router writes its path into the address bar, which here is the preview iframe's own `?id=` story address, so a
 * reload of the frame would find no story. The story's address returns when the stack goes.
 */
function useKeepAddress(): void {
  const [address] = useState(() => window.location.href);

  useEffect(
    () => (): void =>
      window.history.replaceState(window.history.state, '', address),
    [address],
  );
}
