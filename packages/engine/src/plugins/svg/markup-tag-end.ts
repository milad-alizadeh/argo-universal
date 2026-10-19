interface TagCharacter {
  quote: string;
  end: boolean;
}

export function tagEnd(source: string, from: number): number {
  const end = scanTagEnd(source, from);

  if (end === null) throw new Error('unterminated tag');

  return end;
}

function scanTagEnd(source: string, from: number): number | null {
  let quote = '';

  for (let index = from; index < source.length; index += 1) {
    const character = source.charAt(index);
    const scan = scanTagCharacter(quote, character);

    if (scan.end) return index;
    quote = scan.quote;
  }

  return null;
}

function scanTagCharacter(quote: string, character: string): TagCharacter {
  if (quote) return { quote: closeQuote(quote, character), end: false };

  return openQuote(character);
}

function closeQuote(quote: string, character: string): string {
  if (character === quote) return '';

  return quote;
}

function openQuote(character: string): TagCharacter {
  if (character === '"') return { quote: character, end: false };

  if (character === "'") return { quote: character, end: false };

  return { quote: '', end: character === '>' };
}
