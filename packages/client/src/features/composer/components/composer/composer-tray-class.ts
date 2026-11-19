/*
 * The trays above and below the Composer card on a wide window: the plan or request tray and the status tray.
 * Paper fills them with content at 80% in light and a white 3% tray in dark, ringed.
 * Each tray tucks under the card, so it is inset by the card's corner radius: any less and its side and hairline
 * show in the card's rounded corner. The web card is `rounded-2xl` (18px), a native one `rounded-sheet` (28px).
 * The card is the shared frosted glass; a tray takes no backdrop blur of its own.
 */
export const composerTrayClass =
  'self-stretch mx-7 web:mx-4.5 bg-content/80 dark:bg-tray shadow-tray';

/*
 * Each tray tucks 12px under the card, so its side and hairline never show in the card's rounded corner. The web's
 * card's fill is translucent, so on the web the tuck is clipped off at the card's edge: otherwise it
 * shows through the card as a band and a hairline. The 64px elsewhere keeps the tray's shadow, which reaches 44px.
 */
export const composerTopTrayTuckClass =
  '-mb-3 pb-3 web:[clip-path:inset(-64px_-64px_12px_-64px)]';

export const composerBottomTrayTuckClass =
  '-mt-3 pt-3 web:[clip-path:inset(12px_-64px_-64px_-64px)]';

// The line between a tray's sections: the tray ring's own width and colour, light and dark.
export const composerTrayDividerClass =
  'border-t border-shadow-subtle dark:border-hairline';
