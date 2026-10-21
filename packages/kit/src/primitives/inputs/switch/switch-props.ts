import type { KitProps } from '../../kit-props';

// Kit-only: web sizing and decorative presentation.
export type SwitchProps = KitProps<'Switch'> & {
  /** Web only: phones draw the system switch, which has one size. */
  size?: 'sm' | 'md';
  /**
   * The switch only shows a state; the row around it owns the press and the spoken name, so it
   * leaves the tab order. Web only: phones never draw a decorative copy, their rows hold the
   * system switch as the control.
   */
  decorative?: boolean;
};
