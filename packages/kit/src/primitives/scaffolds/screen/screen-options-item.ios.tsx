import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { submenuBadgeText } from '#primitives/actions/action';
import { optionsIcon, optionsSpoken } from './screen-page-options';
import type { PageOptions } from './screen-props';
import { tinted, toolbarBadge, toolbarIcon } from './screen-toolbar-items.ios';

const optionsItem = (options: PageOptions) =>
  ({
    ...tinted,
    icon: toolbarIcon(optionsIcon),
    accessibilityLabel: optionsSpoken(options),
    separateBackground: true,
    onPress: () => options.onOpenChange(true),
  }) as const;

/*
 * The page's Options button, a bar item of its own as a submenu's is, its badge on the icon; it opens the sheet the
 * Screen holds.
 */
export function toolbarOptionsButton(
  options: PageOptions,
  dotColor: string | undefined,
): ReactElement {
  return (
    <Stack.Toolbar.Button key="options" {...optionsItem(options)}>
      {toolbarBadge(submenuBadgeText(options.badge), dotColor)}
    </Stack.Toolbar.Button>
  );
}
