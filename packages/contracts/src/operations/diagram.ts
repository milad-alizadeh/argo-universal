import { z } from 'zod';
import type { OperationDefinition } from './index';

// Far past any diagram a person reads, and under the 131,072-character cap a Plugin's Svg has (ADR-0028).
const sourceLimit = 65_536;

export const DiagramValidateInput = z.strictObject({
  source: z
    .string()
    .max(sourceLimit)
    .describe('The Mermaid source inside the fence, without the ``` lines.'),
});

export const DiagramValidateResult = z.discriminatedUnion('valid', [
  z.strictObject({ valid: z.literal(true) }),
  z.strictObject({
    valid: z.literal(false),
    problems: z.array(
      z.strictObject({
        line: z.number().int().positive().optional(),
        message: z.string(),
      }),
    ),
    // The diagram headers Argo draws, such as `flowchart` and `sequenceDiagram`.
    supported: z.array(z.string()),
  }),
]);

export const diagramOperations = {
  'diagram.validate': {
    id: 'diagram.validate',
    label: 'Validate diagram',
    icon: 'diagram',
    description:
      'Check a Mermaid diagram before you send it: valid, or the problems to fix with their line numbers. The Feed draws only what this passes.',
    params: DiagramValidateInput,
    result: DiagramValidateResult,
    tier: 'read',
    keywords: ['mermaid', 'flowchart', 'sequence', 'lint', 'check', 'chart'],
  },
} as const satisfies Record<string, OperationDefinition>;
