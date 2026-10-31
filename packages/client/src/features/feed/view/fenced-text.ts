// An opening fence of three or more backticks with an optional tag, the text, then a closing fence alone on the last line, at least as long as the opening one (CommonMark).
const fence =
  /^(?<open>`{3,})[^\r\n`]*\r?\n(?<body>[\s\S]*?)(?:(?<=\n)|\r?\n)\k<open>`*\s*$/;

/*
 * The Claude Agent writes a command's output as Markdown, in a ```console fence, and a read file's text
 * in a bare one. The Feed draws that text in a code block of its own, so the fence has to come off. It
 * is read by its first and last lines, not lexed: a command's output may itself hold a line of backticks.
 */
export function unfencedText(text: string): string {
  return text.replace(fence, '$<body>');
}
