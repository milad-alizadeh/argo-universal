import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import type { FeedExploration } from '../feed/feed-view';
import { FeedDisclosure } from './FeedDisclosure';

export interface ExploredRowProps {
  exploration: FeedExploration;
  initialOpen?: boolean;
}

export function ExploredRow({ exploration, initialOpen }: ExploredRowProps) {
  return (
    <FeedDisclosure
      label={exploration.title}
      icon={BookOpenIcon}
      running={exploration.title === 'Exploring'}
      initialOpen={initialOpen}
    >
      <View className="gap-2">
        {exploration.lines.map((line, index) => (
          <Text
            key={`${index}:${line}`}
            className="text-sm leading-5 text-muted-foreground"
          >
            {line}
          </Text>
        ))}
      </View>
    </FeedDisclosure>
  );
}
