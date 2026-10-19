import {
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { sheetInsetClass } from './sheet-inset';
import { backLabel } from './sheet-page-label';
import {
  useLeavingPage,
  useSlideEnd,
  type LeavingPage,
} from './sheet-page-motion';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import { SheetTitleRow } from './sheet-title-row';

interface StackProps {
  hideRootTitle?: boolean;
  inset?: boolean;
  stack: SheetStack;
  label?: string;
  children: ReactNode;
}

// The web's pages: a pushed page slides in from the trailing edge over the one below, and slides back out on Back.
export function SheetPageStack(props: StackProps): ReactElement {
  if (props.stack.pages.length === 0) return <SheetScroll {...props} />;

  return <StackPages {...props} />;
}

function StackPages(props: StackProps): ReactElement {
  const shared = { ...props, leaving: useLeavingPage(props.stack.path) };

  return (
    <div className="relative flex min-h-0 shrink flex-col overflow-hidden">
      {props.stack.pages.map((page, index) => (
        <StackPage key={page.name} {...shared} page={page} index={index} />
      ))}
    </div>
  );
}

// Where a page sits: on top in the flow, under the top one, sliding out, or not drawn.
type PagePlace = 'top' | 'under' | 'leaving' | 'none';

interface PagePosition {
  page: string;
  index: number;
  path: string[];
}

function pagePlace(position: PagePosition, leaving?: string): PagePlace {
  if (position.index === 0) return position.path.length === 0 ? 'top' : 'under';

  return pushedPlace(position, leaving);
}

function pushedPlace(
  { page, path }: PagePosition,
  leaving: string | undefined,
): PagePlace {
  if (path.at(-1) === page) return 'top';

  if (path.includes(page)) return 'under';

  return offPathPlace(page, leaving);
}

// A page off the path is drawn only while Back slides it away.
function offPathPlace(page: string, leaving: string | undefined): PagePlace {
  return page === leaving ? 'leaving' : 'none';
}

type StackPageProps = StackProps & {
  page: SheetPageEntry;
  index: number;
  leaving: LeavingPage;
};

function StackPage(props: StackPageProps): ReactElement | null {
  const place = pagePlace(
    { page: props.page.name, index: props.index, path: props.stack.path },
    props.leaving.name,
  );

  if (place === 'none') return null;

  return <PageFrame {...props} place={place} />;
}

type PageProps = StackPageProps & { place: PagePlace };

function PageFrame(props: PageProps): ReactElement {
  return (
    <div
      ref={usePageSlide(props)}
      {...hiddenUnlessTop(props.place)}
      className={pageClass(props)}
    >
      <PageHeader {...props} />
      <SheetScroll label={props.page.title ?? props.label} inset={props.inset}>
        {props.page.content}
      </SheetScroll>
    </div>
  );
}

// A leaving page reports when its slide has ended, so it can leave the tree.
function usePageSlide(props: PageProps): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useSlideEnd(ref, props.place === 'leaving', props.leaving.done);

  return ref;
}

// Only the top page is read and reached; the others are behind it or sliding away.
function hiddenUnlessTop(place: PagePlace): {
  'aria-hidden'?: true;
  inert?: true;
} {
  return place === 'top' ? {} : { 'aria-hidden': true, inert: true };
}

const placeClass: Record<PagePlace, string> = {
  top: 'relative',
  under: 'absolute inset-x-0 top-0',
  leaving: 'absolute inset-x-0 top-0 translate-x-full',
  none: 'hidden',
};

function pageClass(props: PageProps): string {
  return cn(
    'flex min-h-0 shrink flex-col bg-content transition-transform duration-200 ease-out',
    placeClass[props.place],
    props.index > 0 && 'starting:translate-x-full',
  );
}

function PageHeader(props: PageProps): ReactElement | null {
  if (hideHeader(props)) return null;

  return (
    <SheetTitleRow
      title={props.page.title}
      backLabel={pageBackLabel(props)}
      onBack={props.stack.navigation.back}
    />
  );
}

function hideHeader(props: PageProps): boolean {
  return (
    props.index === 0 && (props.hideRootTitle || !props.page.title) === true
  );
}

function pageBackLabel(props: PageProps): string | undefined {
  return props.index === 0 ? undefined : backLabel(props.stack);
}

type ScrollProps = Pick<StackProps, 'label' | 'inset' | 'children'>;

function SheetScroll(props: ScrollProps): ReactElement {
  return (
    <ScrollView
      className="min-h-0 shrink"
      keyboardShouldPersistTaps="handled"
      role="region"
      accessibilityLabel={props.label}
    >
      <View className={sheetInsetClass(props.inset)}>{props.children}</View>
    </ScrollView>
  );
}
