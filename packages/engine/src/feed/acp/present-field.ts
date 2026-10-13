// ACP sends null or nothing for an absent field; the Feed row then leaves the field out.
export const assignPresentField = <Row, Field extends keyof Row>(
  row: Row,
  field: Field,
  value: Row[Field] | null | undefined,
): void => {
  if (value != null) row[field] = value;
};
