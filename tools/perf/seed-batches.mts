const insertBatchRows = 250;

// Keep SQL construction bounded even when a dataset contains many recorded rows.
export function writeBatches<Row>(
  rows: Row[],
  write: (batch: Row[]) => void,
): void {
  for (let start = 0; start < rows.length; start += insertBatchRows)
    write(rows.slice(start, start + insertBatchRows));
}
