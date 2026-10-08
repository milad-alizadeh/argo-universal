import { clientLibReport } from './client-lib.mjs';
import { componentsReport } from './components.mjs';
import { reportContext } from './context.mjs';
import { genericImportReport, glossaryReport } from './generic-imports.mjs';
import {
  genericPackagesReport,
  productPackagesReport,
} from './shared-packages.mjs';

export function buildHoistingReport(root) {
  const context = reportContext(root);
  return (
    [
      ...reportHeader(context),
      ...clientLibReport(context),
      ...genericPackagesReport(context),
      ...componentsReport(context),
      ...productPackagesReport(context),
      ...genericImportReport(context),
      ...glossaryReport(context),
    ].join('\n') + '\n'
  );
}

function reportHeader(context) {
  return [
    '# hoist-check: three-tier hoisting report (read-only)',
    `modules parsed: ${context.modules.size} (${context.production.length} production); workspace packages: ${context.packages.size}`,
    'Consumers are distinct production files; tests, stories, mocks, e2e, tools, storybook and configs are counted apart.',
    'Barrel imports are followed to the declaring module. ADR-0016 item 9 maps the tiers; this report never gates CI.',
  ];
}
