import { stackProps } from '../core-kit-props';
import { actionSlot, defineKitComponent } from '../define-kit-component';
import {
  cardProps,
  collapsibleCard,
  gridProps,
  scrollViewProps,
  spacerProps,
  surfaceProps,
} from '../layout-kit-props';
import { collapsibleProps, openChange } from '../overlay-kit-props';

const layoutReader = (reader: string): string =>
  `Adds no accessibility element; ${reader} traverses descendants in source order.`;

export const layoutComponents = {
  Spacer: defineKitComponent(
    'Flexible space along its parent Stack direction.',
    spacerProps,
    {
      group: 'layout',
    },
  ),
  Grid: defineKitComponent(
    'Static equal-column grid; use List for long grids.',
    gridProps,
    {
      group: 'layout',
      accessibility: {
        keyboard:
          'Grid is a static layout; keyboard focus moves through interactive children in platform order.',
        voiceOver:
          'VoiceOver traverses the Grid children in source order; the layout adds no grid navigation semantics.',
        talkBack:
          'TalkBack traverses the Grid children in source order; the layout adds no grid navigation semantics.',
      },
      children: true,
    },
  ),
  Surface: defineKitComponent(
    'A named Surface with fill, radius and depth.',
    surfaceProps,
    {
      group: 'layout',
      children: true,
      slots: { actions: actionSlot },
      appearance:
        'background is flat content; card is flat card; muted is recessed tray; glass is sidebar material, with a plain fill below iOS 26 and on Android.',
    },
  ),
  Card: defineKitComponent(
    'A card on the card or glass Surface: media, an icon, title and subtitle, one action, a body and an optional footer; collapsible, its title toggles the body.',
    cardProps,
    {
      group: 'layout',
      children: true,
      slots: {
        media: ['Image', 'Video', 'Svg'],
        icon: ['Icon', 'Avatar', 'Image', 'Svg'],
        actions: ['Button', 'IconButton'],
        footer: ['Text', 'Stack', 'Button', 'Pill'],
      },
      events: { onOpenChange: openChange(collapsibleCard) },
      accessibility: {
        keyboard:
          "A Card with onPress is one focus stop that activates with Enter or Space; its action stays a focus stop of its own. A collapsible Card's title is a button that toggles the body with Enter or Space.",
        voiceOver:
          'A pressable Card is a button named by accessibilityLabel, or its title and subtitle; a static Card is a group of the same name that reads its media, title, subtitle, action and body in order.',
      },
      appearance:
        'Desktop, web and iOS draw the card Surface; Android draws the stock Material 3 filled Card. media runs full bleed across the top; one Button or IconButton sits top right on the title line. A collapsible Card puts its chevron after the title and animates the body open and shut; footer sits under the body inside the same fold.',
    },
  ),
  ScrollView: defineKitComponent(
    'A scroll container owning its scroll fade.',
    scrollViewProps,
    {
      group: 'layout',
      children: true,
    },
  ),
  Stack: defineKitComponent(
    'A row or column layout with token spacing and cross-axis alignment.',
    stackProps,
    {
      group: 'layout',
      children: true,
      accessibility: {
        label:
          'The layout adds no label; child kit components provide their own accessible names.',
        keyboard: 'The layout is not focusable and adds no keyboard shortcut.',
        voiceOver: layoutReader('VoiceOver'),
        talkBack: layoutReader('TalkBack'),
      },
      appearance:
        'Layout uses spacing tokens only; it does not set color or draw Image content.',
    },
  ),
  Collapsible: defineKitComponent(
    'A disclosure container that shows or hides its content.',
    collapsibleProps,
    {
      group: 'layout',
      wire: false,
      children: true,
      events: { onOpenChange: openChange(collapsibleProps) },
      slots: {},
    },
  ),
};
