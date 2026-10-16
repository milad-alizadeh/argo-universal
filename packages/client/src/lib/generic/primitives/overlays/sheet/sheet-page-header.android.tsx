import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import { Icon, IconButton, Row, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  fillMaxWidth,
  height,
  padding,
  semantics,
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
      {!props.root && <BackButton stack={props.stack} />}
      <Text
        maxLines={1}
        style={titleStyle}
        modifiers={titleModifiers(props.root)}
      >
        {props.title}
      </Text>
    </Row>
  );
}

// The back button's 48 dp: a root page's title sits where a pushed page's does.
const headerHeight = 48;

const headerModifiers = [fillMaxWidth(), height(headerHeight)];

// Material's top app bar title.
const titleStyle = { typography: 'titleLarge' } as const;

// The list's 16 dp gutter, so a root page's title lines up with the rows under it; on a pushed page the back button leads instead.
const titleInset = 16;

function titleModifiers(root: boolean): ModifierConfig[] {
  return root
    ? [weight(1), padding(titleInset, 0, titleInset, 0)]
    : [weight(1)];
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
