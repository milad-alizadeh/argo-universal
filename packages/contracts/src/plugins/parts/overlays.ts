import { z } from 'zod';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
} from '../plugin-part-schema-utils';

export const overlaysPartSchemas = {
  Alert: part(
    'A confirmation overlay opened through an Action.',
    z.object({
      title: stringLabel,
      message: optionalLabel,
      confirmLabel: stringLabel,
      cancelLabel: optionalLabel,
    }),
  ),
  Dialog: part(
    'A form overlay opened through an Action; presented as a sheet on phone.',
    z.object({ title: stringLabel }),
    { children: true },
  ),
  Sheet: part(
    'A sheet overlay opened through an Action.',
    z.object({ title: optionalLabel }),
    { children: true },
  ),
  Popover: part('A popover overlay opened through an Action.', z.object({}), {
    children: true,
  }),
  Menu: part('A menu presented from an ActionList.', z.object({}), {
    slots: { actions: ['ActionList'] },
    children: true,
  }),
  Tooltip: part(
    'A short description attached to a control.',
    z.object({ text: stringLabel }),
  ),
  Toast: part(
    'A transient status message opened through an Action.',
    z.object({ title: stringLabel, description: optionalLabel, tone }),
  ),
};
