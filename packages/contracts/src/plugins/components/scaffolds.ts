import { actionSlot, defineKitComponent } from '../define-kit-component';
import { echoes } from '../kit-component-props';
import { openChange } from '../overlay-kit-props';
import {
  detailProps,
  inspectorProps,
  listDetailProps,
  screenProps,
  settingsLayoutProps,
} from '../scaffold-kit-props';

const screenReader =
  'Announces the title as the screen title, then the search field, the Options button and header Actions, then the content. A title with a `titleMenu` is announced as a button with its menu, named by the title; only the web also keeps it a heading.';

const listDetailReader =
  'Reads the list, then the selected item beside it on wide windows; on compact ones the list is the screen and opening a row moves to the item.';

export const scaffoldsComponents = {
  Screen: defineKitComponent(
    'A screen with a title, header Actions, a primary Action, optional search, and content.',
    screenProps,
    {
      group: 'scaffolds',
      children: true,
      root: true,
      slots: {
        // The header's verbs, in Sections: buttons on wide screens and iOS, the toolbar and overflow menu on Android. Header Actions nested in content are not a header.
        actions: actionSlot,
        // The main Action: a header button, iOS toolbar item, or Android FAB.
        primaryAction: ['Action'],
        // The title's menu, such as a picker of what the page shows: the title draws a down chevron and opens these Actions, on phones and wide windows alike.
        titleMenu: actionSlot,
        // The page's options, such as how it shows its items and which it filters: one Options button in the header opens them, as a sheet on a phone and a popover on its button on a wide window.
        options: ['SegmentedControl', 'FieldGroup', 'Stack', 'Button', 'Text'],
        // The page's properties, a FieldGroup of Settings rows: a column beside the content when the window has room, else above it.
        aside: ['FieldGroup'],
        // Held at the foot of the screen above the keyboard, such as a chat's message field.
        footer: ['TextArea', 'Stack', 'Button'],
      },
      // Typed search echoes at once and coalesces, and never holds the screen.
      events: {
        onChangeText: echoes(screenProps, 'value', {
          throttleMs: 150,
          blocks: false,
        }),
      },
      accessibility: {
        label: 'The required `title` names the screen.',
        keyboard:
          'The screen is not focusable. A title with a `titleMenu` is a menu button inside the heading: Tab reaches it, and Enter, Space or Arrow Down opens its menu. Its search field, Options button, header Actions and primary Action use their standard keyboard behavior; Escape closes the options popover; typing in search dispatches onChangeText.',
        voiceOver: screenReader,
      },
    },
  ),
  ListDetail: defineKitComponent(
    'A list beside its selected item on wide windows; on compact ones the list drills in to the item.',
    listDetailProps,
    {
      group: 'scaffolds',
      root: true,
      // The detail is a whole page: its own title and Actions.
      slots: {
        list: ['List'],
        detail: ['Screen', 'Detail'],
        empty: ['EmptyState'],
      },
      accessibility: {
        label:
          'Not labelled itself: the list and the detail name themselves, and the detail Screen names the screen.',
        keyboard:
          'The scaffold is not focusable. Tab moves from the list to the detail on wide windows.',
        voiceOver: listDetailReader,
      },
    },
  ),
  Detail: defineKitComponent(
    "An item page's scrolling content: its Markdown, then its children. Its properties go in the Screen's `aside`.",
    detailProps,
    { group: 'scaffolds', children: true },
  ),
  Inspector: defineKitComponent(
    'Secondary detail about what is open: its own column on wide screens and a Sheet on compact ones.',
    inspectorProps,
    {
      group: 'scaffolds',
      wire: false,
      children: true,
      slots: { actions: actionSlot },
      events: { onOpenChange: openChange(inspectorProps) },
    },
  ),
  SettingsLayout: defineKitComponent(
    'Settings pages: a grouped list of links beside the page shown on wide screens; on compact ones the list pushes each page.',
    settingsLayoutProps,
    {
      group: 'scaffolds',
      wire: false,
      children: true,
      slots: { empty: ['EmptyState'] },
    },
  ),
};
