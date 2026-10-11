import type { ContentBlock, SessionUpdate } from '@repo/contracts';

// The first nonempty line titles a Session until the person or Agent names it.
export function titleFromPrompt(prompt: ContentBlock[]): string {
  return (
    prompt
      .flatMap((block): string[] =>
        block.type === 'text' ? block.text.split('\n') : [],
      )
      .map((line): string => line.trim())
      .find(Boolean) ?? ''
  );
}

export function titleFromRows(rows: SessionUpdate[]): string {
  return titleFromPrompt(
    rows.flatMap((row): ContentBlock[] =>
      row.sessionUpdate === 'user_message' ? row.content : [],
    ),
  );
}
