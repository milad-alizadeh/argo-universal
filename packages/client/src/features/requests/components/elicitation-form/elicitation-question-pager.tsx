import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';

type ModelProps = { model: QuestionModel };

type PagerProps = ModelProps & { direction: keyof typeof pages };

const pages = {
  previous: {
    icon: 'chevron-left',
    label: 'Previous question',
    step: -1,
    atEnd: (model: QuestionModel): boolean => model.index === 0,
  },
  next: {
    icon: 'chevron-right',
    label: 'Next question',
    step: 1,
    atEnd: (model: QuestionModel): boolean => model.last,
  },
} as const;

export function QuestionPager({ model }: ModelProps): ReactElement {
  return (
    <View className="flex-row items-center shrink-0">
      <PagerButton model={model} direction="previous" />
      <PagerButton model={model} direction="next" />
    </View>
  );
}

function PagerButton({ model, direction }: PagerProps): ReactElement {
  return (
    <IconButton
      {...pageProps({ model, direction })}
      variant="ghost"
      size="xs"
    />
  );
}

function pageProps({
  model,
  direction,
}: PagerProps): Pick<
  IconButtonProps,
  'accessibilityLabel' | 'disabled' | 'onPress'
> & { icon: IconSymbol } {
  const page = pages[direction];

  return {
    icon: page.icon,
    accessibilityLabel: page.label,
    disabled: model.inactive || page.atEnd(model),
    onPress: (): void => model.navigate(model.index + page.step),
  };
}
