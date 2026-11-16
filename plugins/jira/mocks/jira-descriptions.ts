import type { Json } from '../json';

const paragraph = (text: string): Json => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const item = (text: string): Json => ({
  type: 'listItem',
  content: [paragraph(text)],
});

// ARGO-3's description as Jira's ADF: a paragraph with a bold mark, then a list.
export const argoThreeDescription: Json = {
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'List a project’s issues ' },
        { type: 'text', text: 'in Argo', marks: [{ type: 'strong' }] },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'bulletList',
      content: [item('Key and summary'), item('Status and assignee')],
    },
  ],
};

// The same description as the page draws it, in Markdown.
export const argoThreeMarkdown =
  'List a project’s issues **in Argo**.\n\n- Key and summary\n- Status and assignee';

export const argoThreeLabels = ['jira', 'spec-0027'];
