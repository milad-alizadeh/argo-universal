export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Spoken name; a switch draws no text of its own. */
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Web only: phones draw the system switch, which has one size. */
  size?: 'default' | 'small';
  /**
   * The switch only shows a state; the row around it owns the press and the spoken name, so it
   * leaves the tab order. Web only: phones never draw a decorative copy, their rows hold the
   * system switch as the control.
   */
  decorative?: boolean;
};
