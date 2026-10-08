import type {
  ElicitationEnumOption,
  PendingElicitation,
} from '@repo/contracts';
import { QuestionIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import type { ElicitationAnswer } from './ElicitationForm';

export interface ElicitationOutcomeProps {
  request: PendingElicitation;
  answer: ElicitationAnswer;
}

export function ElicitationOutcome({
  request,
  answer,
}: ElicitationOutcomeProps) {
  const label = {
    accept: 'You answered',
    cancel: 'You dismissed',
    decline: 'You declined',
  }[answer.action];
  const properties = Object.entries(request.requestedSchema.properties);
  return (
    <View className="w-full gap-2">
      <View className="flex-row items-center gap-1.5">
        <Icon
          as={QuestionIcon}
          size="md"
          className="shrink-0 text-muted-foreground"
        />
        <Text className="text-sm leading-5 text-muted-foreground">{label}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          {properties.length}{' '}
          {properties.length === 1 ? 'question' : 'questions'}
        </Text>
      </View>
      {answer.action === 'accept' && (
        <View className="gap-3 pl-5.5">
          {properties.map(([name, property]) => {
            const value = answer.content?.[name];
            let options: ElicitationEnumOption[] | undefined;
            if (property.type === 'string') options = property.oneOf;
            if (property.type === 'array' && 'anyOf' in property.items)
              options = property.items.anyOf;
            const answers =
              value === undefined
                ? ['Skipped']
                : (Array.isArray(value) ? value : [value]).map((item) => {
                    if (typeof item === 'boolean') return item ? 'Yes' : 'No';
                    return (
                      options?.find((option) => option.const === item)?.title ??
                      String(item)
                    );
                  });
            return (
              <View key={name} className="gap-1">
                <Text className="text-sm leading-5">
                  {property.description ?? property.title ?? name}
                </Text>
                {answers.map((text) => (
                  <Text
                    key={text}
                    className="text-sm leading-5 text-muted-foreground"
                  >
                    {text}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
