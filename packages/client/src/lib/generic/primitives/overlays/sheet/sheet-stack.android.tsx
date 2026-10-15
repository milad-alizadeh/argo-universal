import { HorizontalPager, Column, RNHostView } from '@expo/ui/jetpack-compose';
import type { HorizontalPagerHandle } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  onGloballyPositioned,
  fillMaxHeight,
  fillMaxWidth,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { useRef, type ReactElement, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SheetBody } from './sheet-body';
import { PageHeader } from './sheet-page-header.android';
import {
  usePageScroll,
  useSheetPager,
  type SheetPager,
} from './sheet-pager.android';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';

type PagesProps = SheetProps & { stack: SheetStack };

export function SheetPages(props: PagesProps): ReactElement {
  const fill = fillsHeight(props);

  if (props.stack.pages.length === 0)
    return (
      <PageContent {...props} fill={fill}>
        {props.children}
      </PageContent>
    );

  return <StackPages {...props} fill={fill} />;
}

function StackPages(props: PagesProps & { fill: boolean }): ReactElement {
  const ref = useRef<HorizontalPagerHandle>(null);
  const pager = useSheetPager(props.stack);
  usePageScroll(ref, props.stack.path.length, pager.ready);

  return (
    <HorizontalPager ref={ref} {...pagerProps(pager)}>
      {pagerPages(props, pager)}
    </HorizontalPager>
  );
}

function pagerProps(
  pager: SheetPager,
): Omit<React.ComponentProps<typeof HorizontalPager>, 'children'> {
  return {
    modifiers: sheetModifiers(true),
    userScrollEnabled: false,
    beyondViewportPageCount: 1,
    onSettledPageChange: pager.settled,
  };
}

function pagerPages(
  props: PagesProps & { fill: boolean },
  pager: SheetPager,
): ReactElement[] {
  return pager.pages.map((page, index) => (
    <StackPage
      key={page.name}
      {...props}
      page={page}
      root={index === 0}
      onReady={() => pager.pageReady(index)}
    />
  ));
}

// Paged content keeps one sizing mode while Material owns the medium and large resting heights.
function fillsHeight(props: PagesProps): boolean {
  return props.stack.pages.length > 0 || props.detents?.join() === 'large';
}

function sheetModifiers(fill: boolean): ModifierConfig[] {
  return fill ? [fillMaxWidth(), fillMaxHeight()] : [fillMaxWidth()];
}

type PageProps = PagesProps & {
  page: SheetPageEntry;
  fill: boolean;
  root: boolean;
  onReady: () => void;
};

function StackPage(props: PageProps): ReactElement {
  return (
    <Column modifiers={pageModifiers(props)}>
      <PageHeader {...props} title={props.page.title} />
      <PageContent
        {...props}
        contentScrolls={props.page.contentScrolls ?? props.contentScrolls}
      >
        {props.page.content}
      </PageContent>
    </Column>
  );
}

// React Native content in the Compose sheet: as tall as itself, or filling a full-height sheet.
function PageContent(
  props: PagesProps & { fill: boolean; children: ReactNode },
): ReactElement {
  const { width } = useWindowDimensions();

  return (
    <RNHostView
      matchContents={!props.fill}
      modifiers={props.fill ? [fillMaxWidth(), weight(1)] : [fillMaxWidth()]}
    >
      <View style={{ width }} className={props.fill ? 'flex-1' : undefined}>
        <SheetBody {...props} />
      </View>
    </RNHostView>
  );
}

function pageModifiers(props: PageProps): ModifierConfig[] {
  return [...sheetModifiers(props.fill), onGloballyPositioned(props.onReady)];
}
