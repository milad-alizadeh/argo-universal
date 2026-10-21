// A Plugin writes the text of its own failures, so nothing it says may spell a second log line.
export const oneLine = (text: string): string =>
  text.replaceAll(/[\r\n]/g, ' ');
