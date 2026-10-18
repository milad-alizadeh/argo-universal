import { MenuView } from '@expo/ui/community/menu';
import { type Href, Link } from 'expo-router';
import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { contextMenuSections } from './context-menu-native-items';
import type { ContextMenuProps } from './context-menu-props';
import {
  dividedItems,
  type NativeMenuItem,
  type NativeMenuSection,
} from './menu-native-items';
import { menuSymbol, runAction, sectionAction } from './menu-view-actions.ios';

/*
 * The system context menu on a long press, with its haptic. With a page to preview, expo-router's Link draws it:
 * Link.Trigger, Link.Preview with no children (the `href` page) and Link.Menu. Without one, Expo UI's MenuView
 * `shouldOpenOnLongPress` (a SwiftUI contextMenu) lifts the element itself.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  if (props.preview) return <PreviewMenu {...props} href={props.preview} />;

  return <LiftMenu {...props} />;
}

function LiftMenu(props: ContextMenuProps): ReactElement {
  const { colorScheme } = useNativeTheme();

  return (
    <MenuView
      shouldOpenOnLongPress
      colorScheme={colorScheme}
      {...liftMenuActions(props)}
    >
      {props.children}
    </MenuView>
  );
}

type LiftMenuActions = Pick<
  ComponentProps<typeof MenuView>,
  'actions' | 'onPressAction'
>;

// MenuView takes each group as an inline section, the first headed by the title, and reports the chosen row by id.
function liftMenuActions(props: ContextMenuProps): LiftMenuActions {
  const sections = contextMenuSections(props);
  const items = dividedItems(sections);

  return {
    actions: sections.map(sectionAction),
    onPressAction: (event) => runAction(items, event),
  };
}

type PreviewMenuProps = ContextMenuProps & { href: Href };

/*
 * A card of the page's latest content, as tall as Tailwind's h-56. `height` is only the preview's preferred size: the
 * page lays out before iOS sizes it, so min and max hold the page to it from its first layout, or a list grows to its
 * full content and opens at its top.
 */
const previewHeight = 224;

const previewSize = {
  height: previewHeight,
  minHeight: previewHeight,
  maxHeight: previewHeight,
};

/*
 * Link `asChild` hands its press to the View, which takes none: a tap reaches the element's own press, so the element
 * keeps its navigation; only a tap on the preview opens `href`. The root Link.Menu's `title` heads the menu, and each
 * group is an `inline` Link.Menu, which the system parts with a separator.
 */
function PreviewMenu(props: PreviewMenuProps): ReactElement {
  return (
    <Link href={props.href} asChild>
      <Link.Trigger>
        <View>{props.children}</View>
      </Link.Trigger>
      <Link.Preview style={previewSize} />
      <Link.Menu title={props.title}>
        {contextMenuSections(props).map(previewMenuGroup)}
      </Link.Menu>
    </Link>
  );
}

// Link.Menu keeps only Link.Menu and Link.MenuAction elements among its children, so these build elements rather than components.
const previewMenuGroup = (section: NativeMenuSection): ReactElement => (
  <Link.Menu key={section.items.map((item) => item.id).join()} inline>
    {section.items.map(previewMenuAction)}
  </Link.Menu>
);

// Link.MenuAction: its children are the title, `icon` an SF Symbol, and `disabled` greys it.
const previewMenuAction = (item: NativeMenuItem): ReactElement => (
  <Link.MenuAction
    key={item.id}
    icon={menuSymbol(item.icon)}
    disabled={item.disabled}
    destructive={item.tone === 'danger'}
    onPress={item.choose}
  >
    {item.title}
  </Link.MenuAction>
);

ContextMenu satisfies ComponentType<ContextMenuProps>;
