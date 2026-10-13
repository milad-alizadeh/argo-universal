const choicePrefix = 'choice:';

export function menuTag(value: string): string {
  return choicePrefix + value;
}

export function selectedMenuValue(tag: string): string | undefined {
  return tag.startsWith(choicePrefix)
    ? tag.slice(choicePrefix.length)
    : undefined;
}
