// Agents surround the reply with their own text (pi prints a startup banner, models add code fences or prose), so the prediction is the last JSON object in the reply that has a `suggestion` key.
export function predictionJson(text: string): unknown {
  for (
    let start = text.lastIndexOf('{');
    start !== -1;
    start = text.lastIndexOf('{', start - 1)
  ) {
    const value = objectAt(text, start);

    if (hasSuggestion(value)) return value;
  }

  return undefined;
}

function hasSuggestion(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'suggestion' in value;
}

function objectAt(text: string, start: number): unknown {
  const end = closingBrace(text, start);

  if (end === -1) return undefined;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

class BraceScan {
  private depth = 0;
  private inString = false;
  private escaped = false;

  // True when this character closes the object the scan started on.
  public closes(character: string): boolean {
    if (this.inString) {
      this.readString(character);

      return false;
    }

    if (character === '"') this.inString = true;
    else if (character === '{') this.depth += 1;
    else if (character === '}') this.depth -= 1;

    return character === '}' && this.depth === 0;
  }

  private readString(character: string): void {
    if (this.escaped) this.escaped = false;
    else if (character === '\\') this.escaped = true;
    else if (character === '"') this.inString = false;
  }
}

function closingBrace(text: string, start: number): number {
  const scan = new BraceScan();

  for (let index = start; index < text.length; index += 1)
    if (scan.closes(text.charAt(index))) return index;

  return -1;
}
