// Lists expand before serialization; item rendering never crosses the wire.
export interface KitListProps<Item, Node> {
  items?: readonly Item[];
  renderItem?: (item: Item, index: number) => Node;
}
