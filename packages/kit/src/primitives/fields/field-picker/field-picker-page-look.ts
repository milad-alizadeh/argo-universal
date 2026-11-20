const maximumHeight = 320;

/*
 * The web page is a menu's plain rows that grow to fit, up to a height, then scroll. The page frame holds the
 * popover's one inset around the search, the rows and the action, so the rows add none.
 */
export const fieldPickerPageLook = {
  fit: true,
  maxHeight: maximumHeight,
  appearance: 'plain',
  padding: 0,
  paddingTop: 0,
  paddingBottom: 0,
} as const;
