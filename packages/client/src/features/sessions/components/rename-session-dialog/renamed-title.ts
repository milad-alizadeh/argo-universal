// The title a rename saves; nothing for a blank title or the same title again, which leave the old one.
export function renamedTitle(
  draft: string,
  current: string,
): string | undefined {
  const title = draft.trim();

  return title === '' || title === current ? undefined : title;
}
