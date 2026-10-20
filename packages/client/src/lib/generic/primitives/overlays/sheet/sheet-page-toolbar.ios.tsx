import { Button, Toolbar, ToolbarItem } from '@expo/ui/swift-ui';
import { type ModifierConfig, tint } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { SheetPageEntry } from './sheet-pages';
import type { SheetPageAction } from './sheet-props';

type ToolbarProps = {
  page: SheetPageEntry;
  children: ReactElement;
};

/*
 * A page's action in SwiftUI's own toolbar (Toolbar/index.d.ts, `toolbar(content:)`), as a `topBarTrailing`
 * text button beside the inline navigation title.
 */
export function SheetPageToolbar(props: ToolbarProps): ReactElement {
  const { action } = props.page;

  if (!action) return props.children;

  return (
    <Toolbar>
      {props.children}
      <Toolbar.Content>
        <PageAction action={action} />
      </Toolbar.Content>
    </Toolbar>
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
