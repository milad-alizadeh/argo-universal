import type { StoryObj } from '@storybook/react-native-web-vite';
import type { Composer } from '../src/features/composer/components/composer/composer';
import type { MockAgent } from '../src/lib/product/feed-message.mocks';

export type WrittenPlanStory = StoryObj<typeof Composer>;

export type WrittenPlanPlayContext = Parameters<
  NonNullable<WrittenPlanStory['play']>
>[0];

export interface WrittenPlanScenario {
  width: number;
  agent: MockAgent;
  form: 'markdown' | 'file';
}

export const writtenPlanRegionName = 'Written plan content';
