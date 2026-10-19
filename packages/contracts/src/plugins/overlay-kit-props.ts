import { z } from 'zod';
import { handler } from './plugin-part-props';

// The App flips its open state at once and tells the Plugin without waiting.
export const openChange = z.boolean().meta({ value: 'open', blocks: false });

export const openStateProps = z.object({
  open: z.boolean().optional().describe('Controlled open state.'),
  defaultOpen: z
    .boolean()
    .optional()
    .describe('Initial uncontrolled open state.'),
  onOpenChange: handler('onOpenChange')
    .optional()
    .describe('Reports changes to the open state.'),
});

export const collapsibleProps = openStateProps.extend({
  disabled: z.boolean().optional().describe('Disable the disclosure trigger.'),
});

export const alertProps = z.object({
  open: z.boolean().describe('Whether the alert is open.'),
  onOpenChange: handler('onOpenChange').describe('Reports dismissal.'),
  title: z.string().describe('Question heading.'),
  message: z.string().optional().describe('Question detail.'),
});

export const sheetProps = z.object({
  open: z.boolean().describe('Whether the sheet is open.'),
  onOpenChange: handler('onOpenChange').describe('Reports open state changes.'),
  label: z.string().optional().describe('Spoken sheet name.'),
  detents: z
    .array(z.enum(['medium', 'large']))
    .optional()
    .describe('Heights the sheet may rest at.'),
  initialDetent: z
    .enum(['medium', 'large'])
    .optional()
    .describe('Opening height.'),
  dismissible: z
    .boolean()
    .optional()
    .describe('Allow dismissal by system gestures.'),
});

export const tooltipProps = z.object({
  label: z.string().describe('Description of the attached control.'),
});

export const toastProps = z.object({
  title: z.string().describe('Status heading.'),
  message: z.string().optional().describe('Status detail.'),
  tone: z.enum(['success', 'danger']).describe('Outcome tone.'),
  action: z
    .object({ label: z.string(), onPress: handler('onPress') })
    .optional()
    .describe('Action offered on the web.'),
});
