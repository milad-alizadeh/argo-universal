/*
 * Characters that stand in for others while Lexical reads or writes markdown, so it leaves those
 * alone. Each is a noncharacter the text does not already contain.
 */
const firstStandIn = 0xfd_d0;

export function unusedCharacters(text: string, count: number): string[] {
  const found: string[] = [];
  let point = firstStandIn;
  while (found.length < count) {
    const character = String.fromCodePoint(point);
    if (!text.includes(character)) found.push(character);
    point += 1;
  }
  return found;
}

// Swaps each character of `from` for the one at the same place in `to`.
export function replacer(
  from: string[],
  to: string[],
): (value: string) => string {
  return (value) =>
    Array.from(value, (character) => {
      const index = from.indexOf(character);
      return index === -1 ? character : to[index];
    }).join('');
}
