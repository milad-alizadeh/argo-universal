// Distinct generic row states for the optional leading mark and supporting text.
export const marked = {
  title: 'Search records',
  leadingMark: { icon: 'search', tone: 'info', label: 'Search' },
} as const;

export const markedStatus = {
  title: 'Background activity',
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

export const mutedTitle = {
  title: 'Previous attempt',
  titleTone: 'muted',
} as const;

export const dangerSubtitle = {
  title: 'Upload',
  subtitle: 'Could not finish',
  subtitleTone: 'danger',
} as const;

export const dimmedMark = {
  title: 'Completed review',
  leadingMark: {
    icon: 'flask',
    tone: 'success',
    label: 'Attempt',
    dimmed: true,
  },
} as const;

export const markedWarning = {
  title: 'Review required',
  leadingMark: {
    icon: 'search',
    tone: 'warning',
    label: 'Review',
    status: { tone: 'warning', label: 'Needs input' },
  },
} as const;

export const plainMark = {
  title: 'Completed task',
  leadingMark: {
    icon: 'check',
    tone: 'success',
    label: 'Completed',
    plain: true,
  },
} as const;
