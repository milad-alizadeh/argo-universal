import type { PageTo, PluginProps } from '@argo/plugin-kit';
import type { FilterData, FilterState } from './filter-loader';

type Header = Pick<
  PluginProps['Screen'],
  'title' | 'search' | 'value' | 'onChangeText'
>;

type Source = {
  data: Exclude<FilterData, { state: 'gone' }>;
  to: PageTo<FilterState>;
  query: string;
};

// Search stays in Page state while typing updates the App's field immediately.
export const filterScreenProps = ({ data, to, query }: Source): Header => ({
  title: data.filter.title,
  search: { label: 'Search Issues' },
  value: query,
  onChangeText: to.bind('query'),
});
