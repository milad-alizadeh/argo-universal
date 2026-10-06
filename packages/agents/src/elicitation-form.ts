import type { ElicitationSchema } from '@repo/contracts';

export interface ElicitationQuestion {
  id: string;
  title: string;
  question: string;
  options: { label: string; description?: string }[];
  multiple?: boolean;
}

// Both Agents' question tools become the same ACP form.
export function toElicitationForm(
  questions: ElicitationQuestion[],
): ElicitationSchema {
  return {
    type: 'object',
    properties: Object.fromEntries(
      questions.map((question) => {
        const choices = question.options.map((option) => ({
          const: option.label,
          title: option.label,
          ...(option.description ? { description: option.description } : {}),
        }));
        return [
          question.id,
          question.multiple
            ? {
                type: 'array',
                title: question.title,
                description: question.question,
                items: { anyOf: choices },
              }
            : {
                type: 'string',
                title: question.title,
                description: question.question,
                oneOf: choices,
              },
        ];
      }),
    ),
    required: questions.map((question) => question.id),
  };
}
