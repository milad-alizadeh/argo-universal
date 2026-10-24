import {
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '#kit/utils';
import {
  SheetScreenContent,
  type SheetScreenContentProps,
} from './sheet-screen-content';
import { SheetScreenHeader } from './sheet-screen-header';
import {
  useLeavingScreen,
  useSlideEnd,
  type LeavingScreen,
} from './sheet-screen-motion';
import type { SheetScreenEntry, SheetStack } from './sheet-screens';

interface StackProps {
  hideRootTitle?: boolean;
  inset?: boolean;
  contentScrolls?: boolean;
  stack: SheetStack;
  label?: string;
  children: ReactNode;
}

// The web's pages: a pushed page slides in from the trailing edge over the one below, and slides back out on Back.
export function SheetScreenStack(props: StackProps): ReactElement {
  if (props.stack.pages.length === 0) return <SheetScreenContent {...props} />;

  return <StackScreens {...props} />;
}

function StackScreens(props: StackProps): ReactElement {
  const shared = { ...props, leaving: useLeavingScreen(props.stack.path) };

  return (
    <div className="relative flex min-h-0 shrink flex-col overflow-hidden">
      {props.stack.pages.map((page, index) => (
        <StackScreen key={page.name} {...shared} page={page} index={index} />
      ))}
    </div>
  );
}

// Where a page sits: on top in the flow, under the top one, sliding out, or not drawn.
type ScreenPlace = 'top' | 'under' | 'leaving' | 'none';

interface ScreenPosition {
  page: string;
  index: number;
  path: string[];
}

function screenPlace(position: ScreenPosition, leaving?: string): ScreenPlace {
  if (position.index === 0) return position.path.length === 0 ? 'top' : 'under';

  return pushedPlace(position, leaving);
}

function pushedPlace(
  { page, path }: ScreenPosition,
  leaving: string | undefined,
): ScreenPlace {
  if (path.at(-1) === page) return 'top';

  if (path.includes(page)) return 'under';

  return offPathPlace(page, leaving);
}

// A page off the path is drawn only while Back slides it away.
function offPathPlace(page: string, leaving: string | undefined): ScreenPlace {
  return page === leaving ? 'leaving' : 'none';
}

type StackScreenProps = StackProps & {
  page: SheetScreenEntry;
  index: number;
  leaving: LeavingScreen;
};

function StackScreen(props: StackScreenProps): ReactElement | null {
  const place = screenPlace(
    { page: props.page.name, index: props.index, path: props.stack.path },
    props.leaving.name,
  );

  if (place === 'none') return null;

  return <ScreenFrame {...props} place={place} />;
}

type ScreenProps = StackScreenProps & { place: ScreenPlace };

function ScreenFrame(props: ScreenProps): ReactElement {
  return (
    <div
      ref={useScreenSlide(props)}
      {...hiddenUnlessTop(props.place)}
      className={screenClass(props)}
    >
      <ScreenHeader {...props} />
      <SheetScreenContent {...screenContentProps(props)}>
        {props.page.content}
      </SheetScreenContent>
    </div>
  );
}

const screenContentProps = (
  props: ScreenProps,
): Omit<SheetScreenContentProps, 'children'> => ({
  label: props.page.title ?? props.label,
  inset: props.inset,
  contentScrolls: screenScrolls(props),
});

// A leaving page reports when its slide has ended, so it can leave the tree.
function useScreenSlide(props: ScreenProps): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useSlideEnd(ref, props.place === 'leaving', props.leaving.done);

  return ref;
}

// Only the top page is read and reached; the others are behind it or sliding away.
function hiddenUnlessTop(place: ScreenPlace): {
  'aria-hidden'?: true;
  inert?: true;
} {
  return place === 'top' ? {} : { 'aria-hidden': true, inert: true };
}

const placeClass: Record<ScreenPlace, string> = {
  top: 'relative',
  under: 'absolute inset-x-0 top-0',
  leaving: 'absolute inset-x-0 top-0 translate-x-full',
  none: 'hidden',
};

function screenClass(props: ScreenProps): string {
  return cn(
    'flex min-h-0 shrink flex-col bg-content transition-transform duration-200 ease-out',
    placeClass[props.place],
    props.index > 0 && 'starting:translate-x-full',
  );
}

function ScreenHeader(props: ScreenProps): ReactElement | null {
  return (
    <SheetScreenHeader
      page={props.page}
      stack={props.stack}
      hidden={hideHeader(props)}
      root={props.index === 0}
    />
  );
}

function hideHeader(props: ScreenProps): boolean {
  return (
    props.index === 0 && (props.hideRootTitle || !props.page.title) === true
  );
}

const screenScrolls = (props: ScreenProps): boolean | undefined =>
  props.page.contentScrolls ?? (props.index === 0 && props.contentScrolls);
