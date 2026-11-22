import type { ContentBlock, SessionUpdate } from '@repo/contracts';
import { withoutVoiceInstruction } from '@repo/contracts';

const TITLE_MAX_LENGTH = 40;

// Long first lines are cut at a word boundary so every surface truncates early.
function shortened(line: string): string {
  if (line.length <= TITLE_MAX_LENGTH) return line;

  const cut = line.slice(0, TITLE_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > TITLE_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;

  return `${base.trimEnd()}…`;
}

// The first nonempty line titles a Session until the person or Agent names it.
export function titleFromPrompt(prompt: ContentBlock[]): string {
  return shortened(
    prompt
      .flatMap((block): string[] =>
        block.type === 'text'
          ? withoutVoiceInstruction(block.text).split('\n')
          : [],
      )
      .map((line): string => line.trim())
      .find(Boolean) ?? '',
  );
}

export function titleFromRows(rows: SessionUpdate[]): string {
  return titleFromPrompt(
    rows.flatMap((row): ContentBlock[] =>
      row.sessionUpdate === 'user_message' ||
      row.sessionUpdate === 'prompt_message'
        ? row.content
        : [],
    ),
  );
}
