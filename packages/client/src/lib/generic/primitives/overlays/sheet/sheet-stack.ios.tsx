import {
  Group,
  NavigationDestination,
  NavigationStack,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  navigationBarTitleDisplayMode,
  navigationTitle,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { SheetContent } from './sheet-content.ios';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';

type PagesProps = SheetProps & { stack: SheetStack };

// The sheet's pages: a NavigationStack that pushes with the system slide and titles each page inline.
export function SheetPages(props: PagesProps): ReactElement {
  const [root, ...pushed] = props.stack.pages;

  if (!root) return <SinglePage {...props} />;

  return (
    <NavigationStack path={props.stack.path} onPathChange={props.stack.setPath}>
      <StackPage {...props} page={root} />
      {pushed.map((page) => (
        <NavigationDestination key={page.name} value={page.name}>
          <StackPage {...props} page={page} />
        </NavigationDestination>
      ))}
    </NavigationStack>
  );
}

function SinglePage(props: PagesProps): ReactElement {
  return (
    <SheetContent {...props} fill={props.detents !== undefined}>
      {props.children}
    </SheetContent>
  );
}

function StackPage(props: PagesProps & { page: SheetPageEntry }): ReactElement {
  return (
    <Group modifiers={pageModifiers(props.page.title)}>
      <SheetContent {...props} fill>
        {props.page.content}
      </SheetContent>
    </Group>
  );
}

function pageModifiers(title: string | undefined): ModifierConfig[] {
  return title
    ? [navigationTitle(title), navigationBarTitleDisplayMode('inline')]
    : [];
}
