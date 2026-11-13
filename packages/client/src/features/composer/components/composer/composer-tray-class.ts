/*
 * The trays above and below the Composer card on a wide window: the plan or request tray and the status tray.
 * Paper fills them with content at 80% in light and a white 3% tray in dark, ringed and frosted.
 * Each tray tucks under the card, so it is inset by the card's corner radius: any less and its side and hairline
 * show in the card's rounded corner. The web card is `rounded-2xl` (18px), a native one `rounded-sheet` (28px).
 */
export const composerTrayClass =
  'self-stretch mx-7 web:mx-4.5 bg-content/80 dark:bg-tray shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180';
