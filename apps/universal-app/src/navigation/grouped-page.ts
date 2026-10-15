/*
 * Android's FieldGroup draws the Host palette's surface, which is already the page colour, and the
 * web draws its own list, so a grouped page asks nothing of the screen here (see grouped-page.ios.ts).
 */
export function useGroupedPage(_active: boolean): void {}
