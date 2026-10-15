import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import {
  AnimatedVisibility,
  Box,
  Column,
  EnterTransition,
  ExitTransition,
  Icon,
  IconButton,
  RNHostView,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  fillMaxHeight,
  fillMaxWidth,
  padding,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SheetBody } from './sheet-body';
import { backLabel } from './sheet-page-label';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { sheetDetents } from './sheet-state';

type PagesProps = SheetProps & { stack: SheetStack };

// A pushed page slides in from the trailing edge and back out on Back; the root slides aside under it.
const pushedPage = {
  enterTransition: EnterTransition.slideInHorizontally({ initialOffsetX: 1 }),
  exitTransition: ExitTransition.slideOutHorizontally({ targetOffsetX: 1 }),
};

const rootPage = {
  enterTransition: EnterTransition.slideInHorizontally({ initialOffsetX: -1 }),
  exitTransition: ExitTransition.slideOutHorizontally({ targetOffsetX: -1 }),
};

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
  const { pages, path } = props.stack;
  const shared = { ...props, top: path.at(-1) ?? pages[0]?.name };

  return (
    <Box modifiers={sheetModifiers(props.fill)}>
      {pages.map((page, index) => (
        <StackEntry key={page.name} {...shared} page={page} index={index} />
      ))}
    </Box>
  );
}

type EntryProps = PagesProps & {
  fill: boolean;
  page: SheetPageEntry;
  index: number;
  // The page on top, the only one shown.
  top: string | undefined;
};

function StackEntry(props: EntryProps): ReactElement {
  return (
    <AnimatedVisibility
      visible={props.page.name === props.top}
      {...(props.index === 0 ? rootPage : pushedPage)}
    >
      <StackPage {...props} root={props.index === 0} />
    </AnimatedVisibility>
  );
}

// A sheet that rests only at its full height fills it; any other is as tall as its content.
function fillsHeight(props: PagesProps): boolean {
  const detents = sheetDetents({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });

  return detents?.join() === 'large' || scrollsOnTop(props.stack);
}

function scrollsOnTop(stack: SheetStack): boolean {
  const name = stack.path.at(-1);

  return (
    stack.pages.find((page) => page.name === name)?.contentScrolls === true
  );
}

function sheetModifiers(fill: boolean): ModifierConfig[] {
  return fill ? [fillMaxWidth(), fillMaxHeight()] : [fillMaxWidth()];
}

type PageProps = PagesProps & {
  page: SheetPageEntry;
  fill: boolean;
  root: boolean;
};

function StackPage(props: PageProps): ReactElement {
  return (
    <Column modifiers={sheetModifiers(props.fill)}>
      {showHeader(props) && <PageHeader {...props} />}
      <PageContent
        {...props}
        contentScrolls={props.page.contentScrolls ?? props.contentScrolls}
      >
        {props.page.content}
      </PageContent>
    </Column>
  );
}

function showHeader(props: PageProps): boolean {
  return !props.root || !!props.page.title;
}

function PageHeader(props: PageProps): ReactElement {
  return (
    <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
      {!props.root && <BackButton stack={props.stack} />}
      <Text maxLines={1} modifiers={titleModifiers(props.root)}>
        {props.page.title ?? ''}
      </Text>
    </Row>
  );
}

// The list's 16 dp gutter, so a root page's title lines up with the rows under it; on a pushed page the back button leads instead.
const titleInset = 16;

function titleModifiers(root: boolean): ModifierConfig[] {
  return root
    ? [weight(1), padding(titleInset, 0, titleInset, 0)]
    : [weight(1)];
}

// Material's standard icon button with the Material Symbols back arrow, drawn by Compose so the press reaches the button.
function BackButton({ stack }: Pick<PageProps, 'stack'>): ReactElement {
  return (
    <IconButton
      onClick={stack.navigation.back}
      modifiers={[semantics({ contentDescription: backLabel(stack) })]}
    >
      <Icon source={ArrowBack} />
    </IconButton>
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
