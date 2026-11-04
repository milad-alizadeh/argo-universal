// The Operations the kit's Loader page fixture contributes: one closes an Issue, one notes a typed title.
export const close = {
  name: 'close',
  label: 'Close the Issue',
  description: 'Closes one Issue.',
  tier: 'act' as const,
  params: {
    number: {
      type: 'number' as const,
      description: 'The Issue',
      required: true,
    },
  },
};

export const note = {
  name: 'note',
  label: 'Note a title',
  description: 'Keeps one title.',
  tier: 'act' as const,
  params: {
    title: {
      type: 'string' as const,
      description: 'The title',
      required: true,
    },
  },
};

// An Operation only a Session may run: a person's tap on a page is not one.
export const attach = {
  name: 'attach',
  label: 'Attach to the Session',
  description: 'Acts for the calling Session.',
  tier: 'act' as const,
  caller: ['session' as const],
};
