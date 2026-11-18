// The one place that decides how words drawn from a Voice call look: words still being said use the muted-foreground colour until they are final, then the row's normal colour. The person's bubble and the voice's plain text both read it.
export const transcriptStyle = (
  partial: boolean,
): { tone: 'muted' | undefined; textVariant: 'summary' | 'feed' } =>
  partial
    ? { tone: 'muted', textVariant: 'summary' }
    : { tone: undefined, textVariant: 'feed' };
