export interface DisclosureChevronProps {
  // Turns the chevron down when its section is open; leave it out for a row that opens another page.
  open?: boolean;
  // The size of the icon beside it: md in a row, sm in a collapsible's header.
  size?: 'sm' | 'md';
  className?: string;
}
