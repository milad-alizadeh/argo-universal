export const folder = 'packages/example/src/*';
export const exampleFilename = 'packages/example/src/example.ts';
export const complexityCode = 'eslint(complexity)';
export const current = JSON.stringify({
  overrides: [{ files: [folder], rules: { complexity: 'off' } }],
});

export const report = JSON.stringify({
  diagnostics: [{ filename: exampleFilename, code: complexityCode }],
});

export const commented = `{
  // Keep the header and the next entry's comment.
  "overrides": [
    // complexity
    { "files": ["packages/example/src/*"], "rules": { "complexity": "off" } },
    // max-depth
    { "files": ["packages/other/*"], "rules": { "max-depth": "off" } }
  ]
}
`;

export const depthCode = 'eslint(max-depth)';
