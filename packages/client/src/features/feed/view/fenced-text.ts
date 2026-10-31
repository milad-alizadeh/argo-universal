// A fence of three or more backticks with an optional tag, text, then a closing fence as long as the first.
const fence = /^(`{3,})[^\r\n`]*\r?\n([\s\S]*?)\r?\n?\1[ \t]*$/;

/*
 * The Claude Agent writes a command's output as Markdown, in a ```console fence, and a read file's text
 * in a bare one. The Feed draws that text in a code block of its own, so the fence has to come off. It
 * is read by its first and last lines, not lexed: a command's output may itself hold a line of backticks.
 */
export function unfencedText(text: string): string {
  return fence.exec(text.trimEnd())?.[2] ?? text;
}
