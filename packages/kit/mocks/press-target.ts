/*
 * What a pointer pressing the middle of an element lands on. A part that lets presses fall through to the row under it
 * takes no pointer itself, so a test presses whatever a person's tap would reach.
 */
export function pressTarget(element: Element): Element {
  const box = element.getBoundingClientRect();

  const target = document.elementFromPoint(
    box.x + box.width / 2,
    box.y + box.height / 2,
  );

  if (!target) throw new Error('Nothing under the element to press');

  return target;
}
