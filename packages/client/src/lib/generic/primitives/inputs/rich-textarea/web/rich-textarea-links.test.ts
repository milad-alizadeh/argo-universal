import { describe, expect, it } from 'vitest';
import { isLinkUrl } from '#lib/generic/link-url';
import {
  linksIn,
  roundTrip,
  type ShownLink,
} from '../../../../../../../mocks/rich-textarea-headless';
import { isScriptUrl } from './rich-textarea-links';

const scriptUrl = 'javascript:alert(1)';

const argoUrl = 'https://argo.dev';

describe('A pasted text links the selection', () => {
  it.each([
    'https://github.com/argo/universal/issues/443',
    'http://localhost:8081/sessions?id=a_b',
    'mailto:team@argo.dev',
  ])('when it is the URL %s', (text) => {
    expect(isLinkUrl(text)).toBe(true);
  });

  it.each([
    'Composer spec',
    'github.com/argo/universal',
    'https://argo.dev and more',
    ' https://argo.dev',
    scriptUrl,
    'file:///etc/hosts',
    '',
  ])('not when it is %j', (text) => {
    expect(isLinkUrl(text)).toBe(false);
  });
});

describe('A link that would run a script', () => {
  it.each([
    scriptUrl,
    'JavaScript:alert(1)',
    ' \tjava\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'VBScript:msgbox(1)',
  ])('is refused when it is %j', (url) => {
    expect(isScriptUrl(url)).toBe(true);
  });

  it.each([
    argoUrl,
    '#top',
    './README.md',
    '/docs',
    'sftp://argo.dev/files',
    'tel:+441234567890',
    'docs/javascript:notes',
  ])('is not %j', (url) => {
    expect(isScriptUrl(url)).toBe(false);
  });
});

const linkDrafts: { name: string; markdown: string }[] = [
  {
    name: 'a link',
    markdown: 'Read the [Composer spec](https://argo.dev/spec)',
  },
  {
    name: 'a link next to marks',
    markdown: '**Read** the [spec](https://argo.dev/spec) _now_',
  },
  { name: 'a bold link', markdown: '[**spec**](https://argo.dev/spec)' },
  {
    name: 'a link whose URL holds underscores and stars',
    markdown: 'See [the run](https://ci.argo.dev/runs/snake_case_name?q=a*b*c)',
  },
  {
    name: 'a link whose text holds markdown characters',
    markdown: 'See [snake_case and 2 * 3 ~ 4 \\ end](https://argo.dev/a)',
  },
  {
    name: 'a link whose URL holds noncharacters the text does not',
    markdown: 'Keep [it](https://argo.dev/\uFDD0\uFDD1) as it is',
  },
  {
    name: 'a link whose text holds brackets',
    markdown: 'See [a\\]b \\[c](https://argo.dev/a)',
  },
  {
    name: 'a link whose text ends in a backslash',
    markdown: 'See [C:\\\\](https://argo.dev/a)',
  },
  { name: 'a bare URL', markdown: 'Logs: https://ci.argo.dev/runs/8812' },
  {
    name: 'a link inside a list item',
    markdown: '- Read the [spec](https://argo.dev/spec)\n- Ship',
  },
  {
    name: 'a link inside a quote',
    markdown: '> See [the run](https://ci.argo.dev/runs/snake_case)',
  },
];

describe('Links in a draft', () => {
  it.each(linkDrafts)('export $name as it was imported', ({ markdown }) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it.each<{ name: string; markdown: string; links: ShownLink[] }>([
    {
      name: 'a link',
      markdown: 'Read the [Composer spec](https://argo.dev/spec)',
      links: [{ text: 'Composer spec', url: 'https://argo.dev/spec' }],
    },
    {
      name: 'a link whose URL holds underscores and stars',
      markdown: '[run](https://ci.argo.dev/a_b_c?q=a*b*c)',
      links: [{ text: 'run', url: 'https://ci.argo.dev/a_b_c?q=a*b*c' }],
    },
    {
      name: 'a link inside a list item',
      markdown: '- Read the [spec](https://argo.dev/spec)',
      links: [{ text: 'spec', url: 'https://argo.dev/spec' }],
    },
    {
      name: 'a link inside a quote',
      markdown: '> See [the run](https://ci.argo.dev/runs/8812)',
      links: [{ text: 'the run', url: 'https://ci.argo.dev/runs/8812' }],
    },
    {
      name: 'a link whose text holds a bracket',
      markdown: '[a\\]b](https://argo.dev)',
      links: [{ text: 'a]b', url: argoUrl }],
    },
    {
      name: 'a link whose text ends in a backslash',
      markdown: '[C:\\\\](https://argo.dev)',
      links: [{ text: 'C:\\', url: argoUrl }],
    },
  ])('shows $name as a link', ({ markdown, links }) => {
    expect(linksIn(markdown)).toEqual(links);
  });

  it('shows a bare URL as text until it is typed', () => {
    expect(linksIn('Logs: https://ci.argo.dev/runs/8812')).toEqual([]);
  });
});
