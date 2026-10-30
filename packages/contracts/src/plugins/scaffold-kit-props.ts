import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { screenDefaults, screenWidths } from '../kit-tokens';
import { handler, stringLabel } from './kit-component-props';
import { listItemProps } from './list-kit-props';
import { perSizeClass } from './schema-size-class';
import { WireEvent } from './wire';

export const screenProps = z.object({
  title: stringLabel.describe('The single-line screen title.'),
  caption: z
    .string()
    .optional()
    .describe('A muted line under the title on wide windows; phones hide it.'),
  captionHref: z
    .string()
    .optional()
    .describe(
      'Makes the caption a link, with a link glyph after it: an http, https or mailto URL, or an absolute route within the App.',
    ),
  search: z
    .object({
      label: stringLabel.describe('The search label and placeholder.'),
    })
    .optional()
    .describe('Native search on phones; expanding header search on web.'),
  value: z
    .string()
    .optional()
    .describe('The search query; drafts stay in the App.'),
  // A Plugin event only: an App Action here would run on every keystroke.
  onChangeText: WireEvent.extend({ $event: z.literal('onChangeText') })
    .optional()
    .describe('Receive the search query when it changes.'),
  width: z
    .enum(screenWidths)
    .optional()
    .meta({ default: screenDefaults.width })
    .describe(
      'How wide the content runs on a window wider than the reading column: `content` keeps it to that centred column, `full` fills the screen, as a table, board or canvas wants. Both keep the screen’s side margins.',
    ),
});

export const detailProps = z.object({
  markdown: z
    .string()
    .optional()
    .describe('The content drawn by the Markdown kit component.'),
  isLoading: z
    .boolean()
    .optional()
    .describe('Show the content loading state; the Metadata stays.'),
});

export const listDetailProps = z.object({
  title: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The list’s title: the list screen’s header on compact windows, where the list is the screen and the header returns to it when the item closes, and the heading above the list on wide windows.',
    ),
});

export const inspectorProps = z.object({
  title: stringLabel.describe(
    'The Inspector heading; on compact screens, the sheet title.',
  ),
  open: z.boolean().describe('Whether the Inspector is shown.'),
  onOpenChange: handler('onOpenChange').describe(
    'Reports the Inspector closing, by its close button, a swipe down, Escape or Back.',
  ),
});

const settingsPage = z.object({
  id: z.string().describe('The page identity, which `selected` names.'),
  title: z.string().describe('The page title on its row.'),
  icon: iconName.optional().describe('An Argo icon before the title.'),
  href: z.string().describe('The Argo route the row opens.'),
  value: listItemProps.shape.value,
  badge: listItemProps.shape.badge,
  disabled: listItemProps.shape.disabled,
  accessibilityLabel: listItemProps.shape.accessibilityLabel,
});

export const settingsLayoutProps = z.object({
  sections: perSizeClass(
    z
      .array(
        z.object({
          title: z.string().optional().describe('The group heading.'),
          items: z.array(settingsPage).readonly().describe('The group pages.'),
        }),
      )
      .readonly(),
  ).describe('The settings pages, in groups, optionally by Size class.'),
  selected: z
    .string()
    .optional()
    .describe('The id of the page shown, whose row a wide window marks.'),
});
