export interface ListSearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  // What leads the header above the list, so the bar's text starts where the header's title does.
  leading: 'menu' | 'back';
}

// Only Android draws a search bar at the top of a list; iOS's sits in its header, and a wide window's in the title row.
export function ListSearchBar(
  _: ListSearchBarProps & { className?: string },
): null {
  return null;
}

// The same bar as Compose content, for a list that is itself a Compose view.
export function ListSearchField(_: ListSearchBarProps): null {
  return null;
}
