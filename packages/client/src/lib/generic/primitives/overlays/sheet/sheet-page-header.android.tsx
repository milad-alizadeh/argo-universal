import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import {
  Box,
  Icon,
  IconButton,
  Row,
  Spacer,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  semantics,
  weight,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { backLabel } from './sheet-page-label';
import type { SheetPageEntry, SheetStack } from './sheet-pages';

type HeaderProps = { page: SheetPageEntry; root: boolean; stack: SheetStack };

function showHeader(props: HeaderProps): boolean {
  return !props.root || !!props.page.title;
}

export function PageHeader(props: HeaderProps): ReactElement | null {
  if (!showHeader(props)) return null;

  return (
    <Row verticalAlignment="center" modifiers={headerModifiers}>
      <Side {...props} edge="centerStart">
        <Leading {...props} />
      </Side>
      <Title {...props} />
      <Side {...props} edge="centerEnd">
        <Trailing {...props} />
      </Side>
    </Row>
  );
}

// The back button's 48 dp: a root page's title sits where a pushed page's does.
const headerSize = 48;

// Paper's side slots on a page with an action, as wide on both ends so the title stays centred.
const actionSlotWidth = 88;

const headerModifiers = [fillMaxWidth(), height(headerSize)];

// Material's section title, as the Settings sections use: a sheet page is a section, not a screen. Centred, as Android apps title their sheets.
const titleStyle = { typography: 'titleMedium', textAlign: 'center' } as const;

type SideProps = HeaderProps & {
  edge: 'centerStart' | 'centerEnd';
  children: ReactElement;
};

// A page with an action widens both ends to the action's slot; otherwise each end is the back button's size (`size`: native `width` fails to cast a plain number).
function Side(props: SideProps): ReactElement {
  if (!props.page.action) return props.children;

  return (
    <Box
      contentAlignment={props.edge}
      modifiers={[size(actionSlotWidth, headerSize)]}
    >
      {props.children}
    </Box>
  );
}

function Leading(props: HeaderProps): ReactElement {
  return props.root ? <Slot /> : <BackButton stack={props.stack} />;
}

function Trailing({ page }: HeaderProps): ReactElement {
  return page.action ? <ActionButton action={page.action} /> : <Slot />;
}

function Title({ page }: HeaderProps): ReactElement {
  return (
    <Text maxLines={1} style={titleStyle} modifiers={[weight(1)]}>
      {page.title}
    </Text>
  );
}

// An empty back-button-sized slot, so the title stays centred whether or not Back leads.
function Slot(): ReactElement {
  return <Spacer modifiers={[size(headerSize, headerSize)]} />;
}

// Material's standard icon button with the Material Symbols back arrow, drawn by Compose so the press reaches the button.
function BackButton({ stack }: Pick<HeaderProps, 'stack'>): ReactElement {
  return (
    <IconButton
      onClick={stack.navigation.back}
      modifiers={[semantics({ contentDescription: backLabel(stack) })]}
    >
      <Icon source={ArrowBack} />
    </IconButton>
  );
}

type Action = NonNullable<SheetPageEntry['action']>;

// Material's text button, in the danger colour for a destructive action as an alert's destructive answer is.
function ActionButton({ action }: { action: Action }): ReactElement {
  const palette = useMaterialPalette();

  const colors = action.destructive
    ? palette.dialogDangerColors
    : palette.dialogAnswerColors;

  return (
    <TextButton onClick={action.onPress} colors={colors}>
      <NativeText role="control">{action.label}</NativeText>
    </TextButton>
  );
}
