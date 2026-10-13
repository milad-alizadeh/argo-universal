export const initializeResponseSchema = {
  allOf: [{ $ref: 'acp-v1#/$defs/InitializeResponse' }],
  properties: {
    authMethods: {
      items: {
        anyOf: [
          {
            not: {
              properties: { type: { const: 'terminal' } },
              required: ['type'],
            },
          },
          { $ref: 'acp-v1#/$defs/AuthMethodTerminal' },
        ],
      },
    },
  },
};
