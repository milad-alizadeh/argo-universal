import { ExpoRoot, Stack, useLocalSearchParams } from 'expo-router';
import { use, useEffect, useMemo, useState, type ComponentType } from 'react';
import { PageNavigationEnabled } from '#primitives/scaffolds/page';
import { PushedPageRoute } from '../pushed-page/routes';
import { StackScreensContext, type StackPages } from './stack-story-context';

/*
 * A story's decorator on web: the story is the root of a real expo-router stack held in memory, so its Page draws the
 * header the App's narrow window does. It takes the story context only to match the phone decorator's signature.
 */
export function withStack(pages: StackPages = {}) {
  return function WithStack(
    Story: ComponentType,
    _context?: { id: string },
  ): React.JSX.Element {
    return <MemoryStack Root={Story} pages={pages} />;
  };
}

interface MemoryStackProps {
  Root: ComponentType;
  pages: StackPages;
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
    <PageNavigationEnabled value>
      <Root />
    </PageNavigationEnabled>
  );
}

function PageRoute(): React.JSX.Element | null {
  const { pages } = use(StackScreensContext);
  const { page } = useLocalSearchParams<{ page: string }>();
  const Component = pages[page];

  if (!Component) return null;

  return (
    <PageNavigationEnabled value>
      <Component />
    </PageNavigationEnabled>
  );
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
    ['./page/[id].js', { default: PushedPageRoute }],
    ['./[page].js', { default: PageRoute }],
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
