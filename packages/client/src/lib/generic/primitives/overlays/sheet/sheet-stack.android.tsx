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
import { CompactScope } from '../../../use-size-class/compact-scope';
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
  const pager = useSheetPager(props.stack, props.open);
  usePageScroll(ref, props.stack.path.length, pager.ready);

  return (
    <HorizontalPager ref={ref} {...pagerProps(pager, props.fill)}>
      {pagerPages(props, pager)}
    </HorizontalPager>
  );
}

// The pager sizes like its pages, so a lone root page is not centred in a full-height pager.
function pagerProps(
  pager: SheetPager,
  fill: boolean,
): Omit<React.ComponentProps<typeof HorizontalPager>, 'children'> {
  return {
    modifiers: sheetModifiers(fill),
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

/*
 * A root page alone is as tall as its content, so the sheet wraps it and a footer under it stays in view;
 * once a second page is pushed the pages keep one sizing mode, filling a sheet Material owns the height of,
 * because a page sized to itself inside a sheet Material has already shortened is cut off with nothing to scroll.
 */
export function fillsHeight(props: PagesProps): boolean {
  return props.stack.pages.length > 1 || props.detents?.join() === 'large';
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
      <PageHeader {...props} />
      <PageContent
        {...props}
        contentScrolls={props.page.contentScrolls ?? props.contentScrolls}
      >
        {props.page.content}
      </PageContent>
    </Column>
  );
}

// React Native content in the Compose sheet: as tall as itself, or filling a full-height sheet; a phone-sized sheet on a tablet too, so compact.
function PageContent(
  props: PagesProps & { fill: boolean; children: ReactNode },
): ReactElement {
  return (
    <RNHostView
      matchContents={!props.fill}
      modifiers={props.fill ? [fillMaxWidth(), weight(1)] : [fillMaxWidth()]}
    >
      <SheetWideBody {...props} />
    </RNHostView>
  );
}

// Material's BottomSheetDefaults.SheetMaxWidth, in dp: a tablet's sheet stops at it and centres.
const materialSheetMaxWidth = 640;

function SheetWideBody(
  props: PagesProps & { fill: boolean; children: ReactNode },
): ReactElement {
  const width = Math.min(useWindowDimensions().width, materialSheetMaxWidth);

  return (
    <View style={{ width }} className={props.fill ? 'flex-1' : undefined}>
      <CompactScope>
        <SheetBody {...props} />
      </CompactScope>
    </View>
  );
}

function pageModifiers(props: PageProps): ModifierConfig[] {
  return [...sheetModifiers(props.fill), onGloballyPositioned(props.onReady)];
}
