import { describe, expect, it } from 'vitest';
import {
  linksIn,
  roundTrip,
  type ShownLink,
} from '../../../../../../mocks/rich-textarea-headless';
import { isLinkUrl } from './rich-textarea-links';

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
    'javascript:alert(1)',
    'file:///etc/hosts',
    '',
  ])('not when it is %j', (text) => {
    expect(isLinkUrl(text)).toBe(false);
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
  ])('shows $name as a link', ({ markdown, links }) => {
    expect(linksIn(markdown)).toEqual(links);
  });

  it('shows a bare URL as text until it is typed', () => {
    expect(linksIn('Logs: https://ci.argo.dev/runs/8812')).toEqual([]);
  });
});
