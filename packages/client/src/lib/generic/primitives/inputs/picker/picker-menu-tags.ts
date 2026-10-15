// Options carry a prefix so no option value can collide with the placeholder or message items.
const choicePrefix = 'choice:';

export const placeholderTag = 'placeholder';

export const messageTag = 'message';

export function menuTag(value: string): string {
  return choicePrefix + value;
}
