import { parseAgentEvent, type AgentEvent } from './agent-events';

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

type QuestionProjection = {
  [
    Field in Exclude<keyof ElicitationQuestion, 'options' | 'multiple'>
  ]: unknown;
} & {
  options: {
    [Field in keyof ElicitationQuestion['options'][number]]: unknown;
  }[];
  multiple?: boolean;
};

function questionChoices(question: QuestionProjection): object[] {
  return question.options.map((option): object => ({
    const: option.label,
    title: option.label,
    ...(option.description === undefined
      ? {}
      : { description: option.description }),
  }));
}

function questionProperty(question: QuestionProjection): object {
  const choices = questionChoices(question);
  return {
    title: question.title,
    description: question.question,
    ...(question.multiple
      ? { type: 'array', items: { anyOf: choices } }
      : { type: 'string', oneOf: choices }),
  };
}

function questionSchema(questions: QuestionProjection[]): object {
  return {
    type: 'object',
    properties: Object.fromEntries(
      questions.map((question): [unknown, object] => [
        question.id,
        questionProperty(question),
      ]),
    ),
    required: questions.map((question): unknown => question.id),
  };
}

export function toElicitationRequest(
  toolCallId: string,
  questions: QuestionProjection[],
): AgentEvent {
  return parseAgentEvent({
    type: 'agent.elicitationRequested',
    request: {
      mode: 'form',
      toolCallId,
      message: questions
        .map((question): unknown => question.question)
        .join('\n'),
      requestedSchema: questionSchema(questions),
    },
  });
}
