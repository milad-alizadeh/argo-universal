import type {
  ElicitationEnumOption,
  ElicitationPropertySchema,
  ElicitationSchema,
} from '@repo/contracts';

export interface ElicitationQuestion {
  id: string;
  title: string;
  question: string;
  options: { label: string; description?: string }[];
  multiple?: boolean;
}

export function toQuestionAnswers(
  content: Record<string, unknown> = {},
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(content).map(([name, value]): [string, string[]] => {
      if (typeof value === 'string') return [name, [value]];
      if (
        Array.isArray(value) &&
        value.every((answer): answer is string => typeof answer === 'string')
      )
        return [name, value];
      throw new Error(`Invalid answer for question ${name}`);
    }),
  );
}

// Both Agents' question tools become the same ACP form.
export function toElicitationForm(
  questions: ElicitationQuestion[],
): ElicitationSchema {
  return {
    type: 'object',
    properties: Object.fromEntries(
      questions.map(
        (question): [ElicitationQuestion['id'], ElicitationPropertySchema] => {
          const choices = question.options.map(
            (option): ElicitationEnumOption => ({
              const: option.label,
              title: option.label,
              ...(option.description
                ? { description: option.description }
                : {}),
            }),
          );
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
        },
      ),
    ),
    required: questions.map((question): string => question.id),
  };
}
