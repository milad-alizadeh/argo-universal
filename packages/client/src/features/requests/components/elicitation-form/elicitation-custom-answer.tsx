import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { customAnswer, customValue } from './elicitation-answers';

// A field, not an option row: typing an answer chooses it, beside any options already chosen.
type ModelProps = { model: QuestionModel };

// A native FieldGroup fills its page, so there the one row it holds is given the height of a section of one row.
export function CustomAnswer({ model }: ModelProps): ReactElement {
  return (
    <View className="native:h-24">
      <FieldGroup disabled={model.inactive}>
        <FieldGroup.Section>
          <CustomField model={model} />
        </FieldGroup.Section>
      </FieldGroup>
    </View>
  );
}

const CustomField = ({ model }: ModelProps): ReactElement => (
  <FieldGroup.TextField
    title="Custom answer"
    placeholder="Something else…"
    value={customAnswer(model)}
    onChangeText={(text) => model.change(customValue(model, text))}
  />
);
