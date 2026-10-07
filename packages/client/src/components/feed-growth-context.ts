import { createContext } from 'react';

// Set by the Feed for a row that grows above its old content, as an older page adds a group's first activities; both take the row's list key.
export interface FeedGrowth {
  // Called in the commit that adds the content, before the Feed has moved.
  willGrowAbove: (itemKey: string) => void;
  // Called once the added content has measured.
  grewAbove: (itemKey: string, height: number) => void;
}

export const FeedGrowthContext = createContext<FeedGrowth | null>(null);
