import { Text, TextButton, TopAppBar } from '@expo/ui/jetpack-compose';
import { padding } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { HeaderIconButton } from '#primitives/native/header-icon-button';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { SheetScreenAction } from './sheet-props';
import { drawnAsIcon, type TitleRowProps } from './sheet-title-row-props';

/*
 * A sheet page's header is the page header Android draws on a stack: Material's top app bar with its title at the
 * start, Back as the stock arrow and the page's action as the toolbar's icon button (owner, 2026-10-24). The sheet
 * is the bar's background, and the bar sits under the sheet's handle rather than the status bar.
 */
export function SheetTitleRow(props: TitleRowProps): ReactElement {
  return (
    <Host matchContents={{ vertical: true }}>
      <TopAppBar windowInsets={{}} colors={barColors}>
        <TopAppBar.NavigationIcon>
          <LeadingButton {...props} />
        </TopAppBar.NavigationIcon>
        <TopAppBar.Title>
          <Title title={props.title} />
        </TopAppBar.Title>
        <TopAppBar.Actions>{trailing(props.action)}</TopAppBar.Actions>
      </TopAppBar>
    </Host>
  );
}

const barColors = { containerColor: 'transparent' };

/*
 * The stack's toolbar starts its title at the 72dp keyline, where Material's bar starts it right after Back at 56dp; the
 * title steps the other 16 in. The buttons already sit where the toolbar's do.
 */
const titleStep = 16;

const stackTitleKeyline = [padding(titleStep, 0, 0, 0)];

function Title(props: Pick<TitleRowProps, 'title'>): ReactElement {
  return (
    <Text style={{ typography: 'titleLarge' }} modifiers={stackTitleKeyline}>
      {props.title}
    </Text>
  );
}

// Back on a pushed page, the sheet's close on the root, and nothing on a page that is given neither.
function LeadingButton(props: TitleRowProps): ReactElement | null {
  if (props.backLabel)
    return (
      <HeaderIconButton
        icon="arrow-left"
        label={props.backLabel}
        onPress={props.onBack}
      />
    );

  if (!props.onClose) return null;

  return (
    <HeaderIconButton icon="close" label="Close" onPress={props.onClose} />
  );
}

// An icon action is the toolbar's icon button; a destructive one keeps its label, as the header has no red icon.
function trailing(action: SheetScreenAction | undefined): ReactElement | null {
  if (!action) return null;

  return drawnAsIcon(action) ? (
    <HeaderIconButton
      icon={action.icon}
      label={action.label}
      onPress={action.onPress}
    />
  ) : (
    <TextAction {...action} />
  );
}

function TextAction(action: SheetScreenAction): ReactElement {
  const palette = useMaterialPalette();

  const colors = action.destructive
    ? palette.dialogDangerColors
    : palette.dialogAnswerColors;

  return (
    <TextButton onClick={action.onPress} colors={colors}>
      <Text>{action.label}</Text>
    </TextButton>
  );
}
