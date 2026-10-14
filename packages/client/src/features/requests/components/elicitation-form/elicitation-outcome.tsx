import type {
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';
import type { ElicitationAnswer } from './elicitation-form';
import { elicitationChoices, propertyTitle } from './elicitation-property';

export interface ElicitationOutcomeProps {
  request: PendingElicitation;
  answer: ElicitationAnswer;
}

type Property = ElicitationPropertySchema;

type Entry = [string, Property];

type AnswersProps = { properties: Entry[]; answer: ElicitationAnswer };

type AnswerProps = { entry: Entry; content: ElicitationAnswer['content'] };

type SummaryProps = { label: string; count: number };

const outcomeLabels = {
  accept: 'You answered',
  cancel: 'You dismissed',
  decline: 'You declined',
} as const;

// One recorded answer, as the form sends it: a value, or the values of a multi-select.
type AnswerItem = string | number | boolean;

type RecordedAnswer = AnswerItem | AnswerItem[];

const booleanTitles: [AnswerItem, string][] = [
  [true, 'Yes'],
  [false, 'No'],
];

export function ElicitationOutcome({
  request,
  answer,
}: ElicitationOutcomeProps): React.JSX.Element {
  const properties = Object.entries(request.requestedSchema.properties);

  return (
    <View className="w-full gap-2">
      <OutcomeSummary
        label={outcomeLabels[answer.action]}
        count={properties.length}
      />
      <OutcomeAnswers properties={properties} answer={answer} />
    </View>
  );
}

function OutcomeSummary({ label, count }: SummaryProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon
        name="question"
        role="body"
        className="shrink-0 text-muted-foreground"
      />
      <MutedText>{label}</MutedText>
      <MutedText>
        {count} {count === 1 ? 'question' : 'questions'}
      </MutedText>
    </View>
  );
}

function MutedText({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <Text role="body" className="text-muted-foreground">
      {children}
    </Text>
  );
}

function OutcomeAnswers({
  properties,
  answer,
}: AnswersProps): React.JSX.Element | null {
  if (answer.action !== 'accept') return null;

  return (
    <View className="gap-3 pl-5.5">
      {properties.map((entry) => (
        <OutcomeAnswer key={entry[0]} entry={entry} content={answer.content} />
      ))}
    </View>
  );
}

function OutcomeAnswer({ entry, content }: AnswerProps): React.JSX.Element {
  const [name, property] = entry;

  return (
    <View className="gap-1">
      <Text role="body">{propertyTitle(name, property)}</Text>
      {answerTexts(property, recordedAnswer(content, name)).map((text) => (
        <MutedText key={text}>{text}</MutedText>
      ))}
    </View>
  );
}

function answerTexts(
  property: Property,
  value: RecordedAnswer | undefined,
): string[] {
  if (value === undefined) return ['Skipped'];
  const titles = answerTitles(property);

  return [value].flat().map((item) => titles.get(item) ?? String(item));
}

function answerTitles(property: Property): Map<AnswerItem, string> {
  const options = elicitationChoices(property) ?? [];

  return new Map([
    ...booleanTitles,
    ...options.map((option): [AnswerItem, string] => [
      option.const,
      option.title,
    ]),
  ]);
}

// The Server keeps answers as it received them; anything else reads as skipped.
function recordedAnswer(
  content: AnswerProps['content'],
  name: string,
): RecordedAnswer | undefined {
  const value = content?.[name];

  return isRecordedAnswer(value) ? value : undefined;
}

const isRecordedAnswer = (value: unknown): value is RecordedAnswer =>
  Array.isArray(value) ? value.every(isAnswerItem) : isAnswerItem(value);

const isAnswerItem = (value: unknown): value is AnswerItem =>
  ['string', 'number', 'boolean'].includes(typeof value);
