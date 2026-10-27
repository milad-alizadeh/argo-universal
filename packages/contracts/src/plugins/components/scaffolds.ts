import { actionSlot, defineKitComponent } from '../define-kit-component';
import { echoes } from '../kit-component-props';
import {
  metadataAvatarProps,
  metadataChildComponents,
  metadataLabelProps,
  metadataLinkProps,
  metadataPillsProps,
  metadataProps,
  metadataStatusDotProps,
} from '../metadata-props';
import { openChange } from '../overlay-kit-props';
import {
  detailProps,
  inspectorProps,
  listDetailProps,
  screenProps,
  settingsLayoutProps,
} from '../scaffold-kit-props';

const screenReader =
  'Announces the title as the screen title, then the search field and header Actions, then the content.';

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
          'The screen is not focusable. Its search field, header Actions and primary Action use their standard keyboard behavior; typing in search dispatches onChangeText.',
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
    'An item page: content beside its Metadata on wide screens, above it on narrow ones.',
    detailProps,
    {
      group: 'scaffolds',
      children: true,
      slots: { metadata: ['Metadata'] },
    },
  ),
  Metadata: defineKitComponent(
    'Read-only label/value fields for a detail view.',
    metadataProps,
    { group: 'scaffolds', children: metadataChildComponents },
  ),
  'Metadata.Label': defineKitComponent(
    'A text Metadata field.',
    metadataLabelProps,
    {
      group: 'scaffolds',
    },
  ),
  'Metadata.Link': defineKitComponent(
    'A link Metadata field, currently drawn as plain text.',
    metadataLinkProps,
    { group: 'scaffolds' },
  ),
  'Metadata.Pills': defineKitComponent(
    'A Metadata field containing Pills.',
    metadataPillsProps,
    { group: 'scaffolds', children: ['Pill'] },
  ),
  'Metadata.StatusDot': defineKitComponent(
    'A labelled status Metadata field.',
    metadataStatusDotProps,
    { group: 'scaffolds' },
  ),
  'Metadata.Avatar': defineKitComponent(
    'A person Metadata field.',
    metadataAvatarProps,
    {
      group: 'scaffolds',
    },
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
