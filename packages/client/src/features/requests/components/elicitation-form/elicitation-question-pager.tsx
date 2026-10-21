import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import { cn } from '@repo/kit/utils';
import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
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

const pagerIconRole = Platform.OS === 'android' ? 'body' : 'secondary';

export function QuestionPager({ model }: ModelProps): ReactElement {
  return (
    <View className="flex-row items-center shrink-0">
      <PagerButton model={model} direction="previous" />
      <PagerButton model={model} direction="next" />
    </View>
  );
}

function PagerButton({ model, direction }: PagerProps): ReactElement {
  const wide = useContentWide();

  return (
    <IconButton
      {...pageProps({ model, direction })}
      iconRole={pagerIconRole}
      variant="ghost"
      className={cn(
        'min-w-0 android:min-w-0 w-7 android:w-8 h-11 sm:w-7 sm:h-11 justify-start pt-0.75',
        wide && 'w-6 h-7 sm:w-6 sm:h-7 justify-center pt-0',
      )}
      iconClassName="text-muted-foreground"
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
