export function isModifiedClick(event: { nativeEvent: unknown }): boolean {
  const click = event.nativeEvent;
  if (typeof MouseEvent === 'undefined' || !(click instanceof MouseEvent))
    return false;
  return [
    click.metaKey,
    click.ctrlKey,
    click.shiftKey,
    click.altKey,
    click.button,
  ].some(Boolean);
}
