import { z } from 'zod';
import * as accessibility from './part-accessibility-metadata';
import { part } from './plugin-part-schema-utils';

const line = z.object({
  kind: z.enum(['context', 'added', 'removed', 'note']),
  number: z.number().nullable(),
  text: z.string(),
});

export const proseWireParts = {
  Markdown: part(
    'CommonMark content with Argo typography, Code fences and Link navigation.',
    z.object({
      text: z.string().describe('Markdown source text.'),
      streaming: z
        .boolean()
        .optional()
        .describe('Show a caret at the end of the content.'),
    }),
    { accessibility: accessibility.markdownAccessibility },
  ),
  Code: part(
    'A code block or diff with a copy action.',
    z.object({
      code: z.string().describe('Plain text to display and copy.'),
      language: z
        .string()
        .optional()
        .describe('Language tag for syntax highlighting.'),
      path: z.string().optional().describe('File path shown in the header.'),
      diff: z
        .array(z.object({ header: z.string(), lines: z.array(line) }))
        .optional()
        .describe(
          'Diff hunks; Copy copies their patch and long diffs start with five lines.',
        ),
    }),
  ),
  Link: part(
    'Text that opens an allowed URL or an Argo route.',
    z.object({
      label: z.string().describe('Visible link label.'),
      href: z.string().optional().describe('An http, https or mailto URL.'),
      route: z
        .string()
        .optional()
        .describe('An absolute route within the App.'),
    }),
    { accessibility: accessibility.linkAccessibility },
  ),
};
