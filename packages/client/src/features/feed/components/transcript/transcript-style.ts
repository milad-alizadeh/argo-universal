/*
 * The one place that decides how words drawn from a Voice call look. They draw as the Feed's other messages do,
 * fading in as they arrive while still being said; the muted-foreground colour is the only difference, until
 * they are final. The person's bubble and the voice's plain text both read it.
 */
export interface TranscriptStyle {
  tone: 'muted' | undefined;
  streaming: boolean;
}

export const transcriptStyle = (partial: boolean): TranscriptStyle => ({
  tone: partial ? 'muted' : undefined,
  streaming: partial,
});
