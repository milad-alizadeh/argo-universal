import { z } from 'zod';

const line = z.object({
  kind: z.enum(['context', 'added', 'removed', 'note']),
  number: z.number().nullable(),
  text: z.string(),
});

const codeHeader = {
  language: z
    .string()
    .optional()
    .describe('Language tag for syntax highlighting.'),
  path: z.string().optional().describe('File path shown in the header.'),
};

export const codeProps = z.union([
  z.object({
    code: z.string().describe('Plain text to display and copy.'),
    diff: z.never().optional(),
    ...codeHeader,
  }),
  z.object({
    code: z.never().optional(),
    diff: z
      .array(z.object({ header: z.string(), lines: z.array(line) }))
      .describe(
        'Diff hunks; Copy copies their patch and long diffs start with five lines.',
      ),
    ...codeHeader,
  }),
]);

export const markdownProps = z.object({
  text: z.string().describe('Markdown source text.'),
  streaming: z
    .boolean()
    .optional()
    .describe('Show a caret at the end of the content.'),
});

export const linkProps = z.object({
  label: z.string().describe('Visible link label.'),
  href: z.string().optional().describe('An http, https or mailto URL.'),
  route: z.string().optional().describe('An absolute route within the App.'),
});
