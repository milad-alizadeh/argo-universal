export interface SpinnerProps {
  // Spoken only: the spinner draws no text.
  accessibilityLabel: string;
  // The colour of the control it runs in, such as an Alert answer; muted by default.
  tone?: SpinnerTone;
}

export type SpinnerTone = 'muted' | 'accent' | 'danger';
