import type { Json } from '../json';

/*
 * ARGO-2's description as Jira's ADF, holding every block and mark the issue page turns into Markdown, and the
 * Markdown it draws. Its code holds three backticks, which must not close the fence; its image is left out.
 */
const text = (value: string, ...marks: Json[]): Json => ({
  type: 'text',
  text: value,
  marks,
});

const node = (type: string, content: Json[], attrs: Json = {}): Json => ({
  type,
  attrs,
  content,
});

const leaf = (type: string, attrs: Json = {}): Json => ({ type, attrs });

const paragraph = (...content: Json[]): Json => node('paragraph', content);

const cell = (type: string, value: string): Json =>
  node(type, [paragraph(text(value))]);

const marked = paragraph(
  text('See '),
  text('the spec', {
    type: 'link',
    attrs: { href: 'https://example.com/spec' },
  }),
  text(', '),
  text('soon', { type: 'em' }),
  text(' and '),
  text('never', { type: 'strike' }),
  text(' with '),
  text('argo run', { type: 'code' }),
  leaf('hardBreak'),
  leaf('mention', { id: 'account-ada', text: '@Ada Lovelace' }),
  text(' '),
  leaf('emoji', { shortName: ':tada:', text: '🎉' }),
  text(' by '),
  leaf('date', { timestamp: '1767225600000' }),
  text(' '),
  leaf('status', { text: 'BLOCKED', color: 'red' }),
  text(' '),
  leaf('inlineCard', { url: 'https://example.com/card' }),
);

const tasks = node('taskList', [
  node('taskItem', [text('Sign in')], { state: 'DONE' }),
  node('taskItem', [text('List issues')], { state: 'TODO' }),
]);

const table = node('table', [
  node('tableRow', [cell('tableHeader', 'Key'), cell('tableHeader', 'Status')]),
  node('tableRow', [cell('tableCell', 'ARGO-1'), cell('tableCell', 'To Do')]),
]);

export const richDescription: Json = node('doc', [
  node('heading', [text('Plan')], { level: 2 }),
  marked,
  node(
    'orderedList',
    [
      node('listItem', [paragraph(text('Third'))]),
      node('listItem', [paragraph(text('Fourth'))]),
    ],
    { order: 3 },
  ),
  tasks,
  node('codeBlock', [text("const fence = '```';")], { language: 'ts' }),
  node('blockquote', [paragraph(text('Quoted'))]),
  node('panel', [paragraph(text('Note'))], { panelType: 'info' }),
  leaf('rule'),
  table,
  node('expand', [paragraph(text('Hidden detail'))], { title: 'More' }),
  node('mediaSingle', [leaf('media', { id: 'image-1', type: 'file' })]),
]);

export const richMarkdown = [
  '## Plan',
  'See [the spec](https://example.com/spec), _soon_ and ~~never~~ with `argo run`  \n@Ada Lovelace 🎉 by 2026-01-01 BLOCKED <https://example.com/card>',
  '3. Third\n4. Fourth',
  '- [x] Sign in\n- [ ] List issues',
  "````ts\nconst fence = '```';\n````",
  '> Quoted',
  '> Note',
  '---',
  '| Key | Status |\n| --- | --- |\n| ARGO-1 | To Do |',
  'Hidden detail',
].join('\n\n');
