import {
  Group,
  NavigationDestination,
  NavigationStack,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  background,
  containerBackground,
  navigationBarTitleDisplayMode,
  navigationTitle,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { SheetContent } from './sheet-content.ios';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';

// A popover sizes to its pages, so they match their content at the popover's width.
type PagesProps = SheetProps & { stack: SheetStack; popoverWidth?: number };

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
    <SheetContent
      {...props}
      fill={props.detents !== undefined && !props.popoverWidth}
      width={props.popoverWidth}
    >
      {props.children}
    </SheetContent>
  );
}

function StackPage(props: PagesProps & { page: SheetPageEntry }): ReactElement {
  return (
    <Group modifiers={usePageModifiers(props.page.title)}>
      <SheetContent
        {...props}
        contentScrolls={props.page.contentScrolls ?? props.contentScrolls}
        fill={!props.popoverWidth}
        width={props.popoverWidth}
      >
        {props.page.content}
      </SheetContent>
    </Group>
  );
}

function usePageModifiers(title: string | undefined): ModifierConfig[] {
  const { content } = useNativeTheme().colors;

  return [
    ...(content
      ? [background(content), containerBackground(content, 'navigation')]
      : []),
    ...titleModifiers(title),
  ];
}

function titleModifiers(title: string | undefined): ModifierConfig[] {
  return title
    ? [navigationTitle(title), navigationBarTitleDisplayMode('inline')]
    : [];
}
