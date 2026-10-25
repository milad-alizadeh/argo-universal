import { z } from 'zod';
import { iconName } from '../../kit-symbols/icon-schema';
import { listItemProps } from '../kit-props';
import { openChange } from '../overlay-kit-props';
import {
  actionSlot,
  handler,
  part,
  stringLabel,
} from '../plugin-part-schema-utils';
import { perSizeClass } from '../schema-size-class';

const inspectorProps = z.object({
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

const settingsLayoutProps = z.object({
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

export const scaffoldsPartSchemas = {
  Inspector: part(
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
  SettingsLayout: part(
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
