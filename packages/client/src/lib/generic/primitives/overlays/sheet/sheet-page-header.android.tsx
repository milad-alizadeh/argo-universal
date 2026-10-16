import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import { Icon, IconButton, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  semantics,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { backLabel } from './sheet-page-label';
import type { SheetStack } from './sheet-pages';

type HeaderProps = { root: boolean; title?: string; stack: SheetStack };

function showHeader(props: HeaderProps): boolean {
  return !props.root || !!props.title;
}

export function PageHeader(props: HeaderProps): ReactElement | null {
  if (!showHeader(props)) return null;

  return (
    <Row verticalAlignment="center" modifiers={headerModifiers}>
      {props.root ? <Slot /> : <BackButton stack={props.stack} />}
      <Text maxLines={1} style={titleStyle} modifiers={[weight(1)]}>
        {props.title}
      </Text>
      <Slot />
    </Row>
  );
}

// The back button's 48 dp: a root page's title sits where a pushed page's does.
const headerSize = 48;

const headerModifiers = [fillMaxWidth(), height(headerSize)];

// Material's section title, as the Settings sections use: a sheet page is a section, not a screen. Centred, as Android apps title their sheets.
const titleStyle = { typography: 'titleMedium', textAlign: 'center' } as const;

// An empty back-button-sized slot, so the title stays centred whether or not Back leads; size(), as Android's width() rejects a number (modifiers/index.d.ts takes one, the native record wants an Int).
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
