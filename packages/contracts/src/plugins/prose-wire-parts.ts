import { z } from 'zod';
import { part } from './plugin-part-schema-utils';

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

const codeProps = z.union([
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
    {
      group: 'content',
      accessibility: {
        keyboard:
          'Markdown adds no focus stop; keyboard focus reaches links and other interactive content in document order.',
        voiceOver:
          'VoiceOver reads the Markdown in document order and exposes links as separate link controls.',
        talkBack:
          'TalkBack reads the Markdown in document order and exposes links as separate link controls.',
      },
    },
  ),
  Code: part(
    'A code block or diff with a copy action; provide either code or diff.',
    codeProps,
    { group: 'content' },
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
    {
      group: 'content',
      accessibility: {
        keyboard:
          'Keyboard focus reaches the Link in platform order; Enter opens its destination.',
        voiceOver:
          'VoiceOver exposes a link, reads its label, and opens its destination when activated.',
        talkBack:
          'TalkBack exposes a link, reads its label, and opens its destination when activated.',
      },
    },
  ),
};
