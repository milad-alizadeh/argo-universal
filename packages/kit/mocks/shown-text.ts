/*
 * The text a RichTextarea shows, line breaks included. On the web, Lexical holds an empty line open
 * with a <br>, which innerText reads as one trailing newline.
 */
export function shownText(field: HTMLElement): string {
  return field.innerText.replace(/\n$/, '');
}
