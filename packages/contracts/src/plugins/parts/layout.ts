import { z } from 'zod';
import { collapsibleProps } from '../overlay-kit-props';
import { gridAccessibility } from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  onPress,
  containerParts,
  actions,
} from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const layoutPartSchemas = {
  Stack: wireParts.Stack,
  Spacer: part(
    'Flexible space inside a layout.',
    z.object({
      minLength: z.number().optional().describe('Minimum token length.'),
    }),
  ),
  Grid: part(
    'Static grid layout; use List for long or virtual grids.',
    z.object({
      columns: z
        .union([
          z.number().int().positive(),
          z.record(z.string(), z.number().int().positive()),
        ])
        .describe('Column count, optionally by Size class.'),
      gap: z.number().optional().describe('Spacing token between cells.'),
    }),
    {
      children: true,
      accessibility: gridAccessibility,
    },
  ),
  Surface: part(
    'A semantic surface with fill, radius, depth, and optional press behavior.',
    z.object({
      kind: z
        .enum(['card', 'tray', 'glass', 'overlay'])
        .describe('Surface treatment.'),
      fill: z
        .enum(['content', 'card', 'muted', 'accent', 'overlay'])
        .optional()
        .describe('Semantic fill role.'),
      radius: z
        .enum(['sm', 'md', 'lg', 'xl', '2xl', 'full', 'control', 'sheet'])
        .optional()
        .describe('Semantic shape token.'),
      depth: z
        .enum(['card', 'tray', 'glass', 'raised'])
        .optional()
        .describe('Semantic depth token.'),
      onPress: onPress.optional(),
      actions: z
        .array(z.object({ label: stringLabel, onPress }))
        .optional()
        .describe('Actions available from this surface.'),
    }),
    {
      children: true,
      events: { onPress: z.undefined() },
      appearance:
        'The `kind` selects a semantic surface. `glass` falls back to a plain fill below iOS 26; all fills adapt to light and dark appearance.',
      accessibility: {
        keyboard:
          'A Surface with onPress enters keyboard focus order and activates with Enter or Space; otherwise focus moves through its interactive children.',
        voiceOver:
          'A pressable Surface exposes button semantics and its child content; a static Surface leaves its children as separate elements.',
        talkBack:
          'A pressable Surface exposes button semantics and its child content; a static Surface leaves its children as separate elements.',
      },
    },
  ),
  Card: part(
    'A composed card with fixed media, title, subtitle, body, and action Slots.',
    z.object({ onPress: onPress.optional() }),
    {
      slots: {
        media: ['Image', 'Video'],
        title: ['Text'],
        subtitle: ['Text'],
        body: containerParts,
        actions,
      },
      events: { onPress: z.undefined() },
      accessibility: {
        keyboard:
          'A Card with onPress enters keyboard focus order and activates with Enter or Space; otherwise focus moves through its interactive Slots.',
        voiceOver:
          'A pressable Card exposes button semantics and its title; a static Card keeps its media, text, and actions in reading order.',
        talkBack:
          'A pressable Card exposes button semantics and its title; a static Card keeps its media, text, and actions in reading order.',
      },
    },
  ),
  ScrollView: part(
    'A scroll container with an Argo-drawn scroll fade.',
    z.object({
      axis: z
        .enum(['vertical', 'horizontal'])
        .optional()
        .describe('Scroll direction.'),
    }),
    { children: true },
  ),
  Collapsible: part(
    'A disclosure container that shows or hides its content.',
    collapsibleProps,
    {
      previous: [
        z.object({
          label: stringLabel,
          expanded: z
            .boolean()
            .optional()
            .describe('Whether content is initially expanded.'),
        }),
      ],
      children: true,
      events: { onOpenChange: z.boolean() },
      slots: {},
    },
  ),
};
