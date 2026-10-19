export const files = [
  { name: 'Foundations', id: '01M4RJ2FP7N272AE463G6PT2QD' },
  { name: 'Sessions', id: '01M4RJRP22R2R2JE20RWDNXR0Q' },
  { name: 'Feed & Inspector', id: '01M4RJWCAC00EA21V8BKY91FEV' },
  { name: 'Composer', id: '01M4RJXN4XTK41J7TDNBBD87G1' },
  { name: 'Settings', id: '01M4RJMTRRZ4K9B62YQ0P53CR5' },
  { name: 'Voice', id: '01M4RJ7EBVF0CGT31XYHHYVHYV' },
  { name: 'Atlas', id: '01M4RJB4J2JMHAQCZYTSD808R7' },
  { name: 'Setup', id: '01M4RJFEE925T7Z1Q0E3J8CF7M' },
  { name: 'Issues', id: '01M4RJGJ2N1YKV0K3RHF80FKZP' },
];

export function selectedFiles(fileId?: string): typeof files {
  if (!fileId) return files;
  const selected = files.filter((file) => file.id === fileId);

  if (!selected.length) throw new Error(`Not a canonical file: ${fileId}`);

  return selected;
}
