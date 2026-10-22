export interface DisclosureChevronProps {
  // Turns the chevron down when its section is open; leave it out for a row that opens another page.
  open?: boolean;
  // Defaults to sm; a collapsible's header takes xs.
  size?: 'xs' | 'sm';
  className?: string;
}
