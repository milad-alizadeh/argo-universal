import type { ElicitationEnumOption } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { selectedAnswers } from './elicitation-answers';

type ModelProps = { model: QuestionModel };

type PickerOption = { value: string; label: string; subtitle?: string };

const pickerOption = (option: ElicitationEnumOption): PickerOption => ({
  value: option.const,
  label: option.title,
  subtitle: option.description,
});

const offered = (model: QuestionModel, answer: string): boolean =>
  model.question.options.some((option) => option.const === answer);

// What the options mark as chosen: a typed custom answer is the text field's, so it marks no option.
const chosen = (model: QuestionModel): string[] =>
  selectedAnswers(model).filter((answer) => offered(model, answer));

// The options chosen now, then the custom answer typed beside them, if any.
const withCustom = (
  model: QuestionModel,
  next: readonly string[],
): string[] => [
  ...next,
  ...selectedAnswers(model).filter((answer) => !offered(model, answer)),
];

/*
 * The options as an inline Picker, a radio per option or a checkbox when several are allowed. Called, not rendered: a
 * FieldGroup Section opens an inline Picker into rows by its element type.
 */
export const questionChoices = ({ model }: ModelProps): ReactElement =>
  model.question.multiple ? multipleChoices(model) : singleChoice(model);

const singleChoice = (model: QuestionModel): ReactElement => (
  <FieldGroup.Picker
    {...pickerProps(model)}
    value={chosen(model)[0] ?? ''}
    onValueChange={(next) => model.change(next)}
  />
);

const multipleChoices = (model: QuestionModel): ReactElement => (
  <FieldGroup.Picker
    {...pickerProps(model)}
    multiple
    value={chosen(model)}
    onValueChange={(next) => model.change(withCustom(model, next))}
  />
);

const pickerProps = (model: QuestionModel) =>
  ({
    key: 'choices',
    title: model.question.title,
    presentation: 'inline',
    disabled: model.inactive,
    options: model.question.options.map(pickerOption),
  }) as const;
