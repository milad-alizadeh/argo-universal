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
import { SheetPageToolbar } from './sheet-page-toolbar.ios';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { sheetDetents } from './sheet-state';

// A popover sizes to its pages, so they match their content at the popover's width.
type PagesProps = SheetProps & { stack: SheetStack; popoverWidth?: number };

// The sheet's pages: a NavigationStack that pushes with the system slide and titles each page inline.
export function SheetPages(props: PagesProps): ReactElement {
  const [root, ...pushed] = props.stack.pages;

  if (!root) return <SinglePage {...props} />;

  return (
    <NavigationStack path={props.stack.path} onPathChange={props.stack.setPath}>
      <StackPage
        {...props}
        page={root}
        onClose={props.stack.navigation.close}
      />
      {pushed.map((page) => pushedPage(props, page))}
    </NavigationStack>
  );
}

const pushedPage = (props: PagesProps, page: SheetPageEntry): ReactElement => (
  <NavigationDestination key={page.name} value={page.name}>
    <StackPage {...props} page={page} />
  </NavigationDestination>
);

/*
 * A page fills a sheet presented at detents, and is as tall as itself in one that fits its content.
 * The detents read here are the ones the sheet is presented at, which a paged sheet is given without
 * naming them: a page sized to itself inside a shorter sheet is cut off at the sheet's edge.
 */
function SinglePage(props: PagesProps): ReactElement {
  const detents = sheetDetents({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });

  return (
    <SheetContent
      {...props}
      fill={detents !== undefined && !props.popoverWidth}
      width={props.popoverWidth}
    >
      {props.children}
    </SheetContent>
  );
}

type PageProps = PagesProps & {
  page: SheetPageEntry;
  // Given to the root page alone, which has no page below it to go back to.
  onClose?: () => void;
};

function StackPage(props: PageProps): ReactElement {
  return (
    <SheetPageToolbar page={props.page} onClose={props.onClose}>
      <PageBody {...props} />
    </SheetPageToolbar>
  );
}

function PageBody(props: PageProps): ReactElement {
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
