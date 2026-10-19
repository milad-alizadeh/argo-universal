import { z } from 'zod';
import { openChange } from '../overlay-kit-props';
import { handler, part, stringLabel } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

const inspectorProps = z.object({
  title: stringLabel.describe(
    'The Inspector heading; on compact screens, the sheet title.',
  ),
  open: z.boolean().describe('Whether the Inspector is shown.'),
  onOpenChange: handler('onOpenChange').describe(
    'Reports the Inspector closing, by its close button, a swipe down, Escape or Back.',
  ),
});

export const scaffoldsPartSchemas = {
  Page: wireParts.Page,
  ListDetail: wireParts.ListDetail,
  Inspector: part(
    'Secondary detail about what is open: its own column on wide screens and a Sheet on compact ones.',
    inspectorProps,
    {
      children: true,
      slots: { actions: ['ActionList'] },
      events: { onOpenChange: openChange(inspectorProps) },
    },
  ),
};
