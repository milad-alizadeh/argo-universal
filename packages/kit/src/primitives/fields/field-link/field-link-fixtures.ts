// Distinct generic row states for the optional leading mark and supporting text.
export const marked = {
  title: 'Search records',
  leadingMark: { icon: 'search', tone: 'info', label: 'Search' },
} as const;

export const markedStatus = {
  title: 'Background activity',
  subtitle: 'Processing items',
  leadingMark: {
    icon: 'sparkle',
    tone: 'neutral',
    label: 'Activity',
    status: { tone: 'success', label: 'Running' },
  },
} as const;

export const supportingValue = {
  title: 'Saved items',
  subtitle: 'Available for review',
  value: '12',
} as const;

export const mutedDanger = {
  title: 'Previous attempt',
  titleTone: 'muted',
  subtitle: 'Could not finish',
  subtitleTone: 'danger',
  leadingMark: {
    icon: 'flask',
    tone: 'success',
    label: 'Attempt',
    dimmed: true,
  },
} as const;

export const markedWarning = {
  title: 'Review required',
  subtitle: 'Waiting for a choice',
  leadingMark: {
    icon: 'search',
    tone: 'warning',
    label: 'Review',
    status: { tone: 'warning', label: 'Needs input' },
  },
} as const;

export const plainMark = {
  title: 'Completed task',
  subtitle: 'Finished successfully',
  leadingMark: {
    icon: 'check',
    tone: 'success',
    label: 'Completed',
    plain: true,
  },
} as const;
