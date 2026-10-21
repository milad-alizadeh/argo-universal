import { Button, Toolbar, ToolbarItem } from '@expo/ui/swift-ui';
import { type ModifierConfig, tint } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import type { SheetPageEntry } from './sheet-pages';
import type { SheetPageAction } from './sheet-props';

type ToolbarProps = {
  page: SheetPageEntry;
  /*
   * The sheet's own way out, which only the root page carries: there is nothing below it for the system's
   * Back to return to, and the leading end of the bar would otherwise stand empty (owner, 2026-10-21).
   */
  onClose?: () => void;
  children: ReactElement;
};

/*
 * A page's close and action in SwiftUI's own toolbar (Toolbar/index.d.ts, `toolbar(content:)`), beside the
 * inline navigation title: the close leading, the action trailing.
 */
export function SheetPageToolbar(props: ToolbarProps): ReactElement {
  const items = toolbarItems(props);

  if (items.length === 0) return props.children;

  return (
    <Toolbar>
      {props.children}
      <Toolbar.Content>{items}</Toolbar.Content>
    </Toolbar>
  );
}

function toolbarItems(props: ToolbarProps): ReactElement[] {
  const { action } = props.page;

  return [
    ...(props.onClose
      ? [<CloseItem key="close" onClose={props.onClose} />]
      : []),
    ...(action ? [<PageAction key="action" action={action} />] : []),
  ];
}

/*
 * SwiftUI's own close button (Button/index.d.ts, role `close`): given no label the system draws it as the
 * xmark, the glyph every other sheet on the platform is dismissed by.
 */
function CloseItem({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <ToolbarItem placement="topBarLeading">
      <Button role="close" onPress={onClose} />
    </ToolbarItem>
  );
}

// A destructive action takes the danger token, as a danger Button does.
function PageAction({ action }: { action: SheetPageAction }): ReactElement {
  const { colors } = useNativeTheme();

  return (
    <ToolbarItem placement="topBarTrailing">
      <Button
        label={action.label}
        onPress={action.onPress}
        modifiers={actionModifiers(
          action.destructive ? colors.danger : undefined,
        )}
      />
    </ToolbarItem>
  );
}

function actionModifiers(color: string | undefined): ModifierConfig[] {
  return color ? [tint(color)] : [];
}
