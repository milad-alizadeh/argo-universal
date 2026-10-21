import type { Tokens } from 'marked';
import { lexMarkdown } from '#lib/generic/lex-markdown';

const firstHeading = (content: string): Tokens.Heading | undefined =>
  lexMarkdown(content).find(
    (token): token is Tokens.Heading => token.type === 'heading',
  );

// A plan's name: its first heading, else the fallback.
export const planTitle = (content: string, fallback: string): string =>
  firstHeading(content)?.text ?? fallback;

// The plan under its title, where the title is drawn once above it.
export function withoutPlanTitle(content: string): string {
  const heading = firstHeading(content);

  if (!heading) return content;
  const at = content.indexOf(heading.raw);

  return (
    content.slice(0, at) +
    content.slice(at + heading.raw.length).replace(/^\n+/, '')
  );
}
