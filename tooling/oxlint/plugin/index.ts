import { definePlugin } from '@oxlint/plugins';
import { apiTypeOnly } from './api-type-only.ts';
import { crossPackageImport } from './cross-package-import.ts';
import { databaseClient } from './database-client.ts';
import { iconSize } from './icon-size.ts';
import { jsonParseCast } from './json-parse-cast.ts';
import { mockEnvironment } from './mock-environment.ts';
import { noInternalMock } from './no-internal-mock.ts';
import { vendorName } from './vendor-name.ts';

// Argo's own rules; argo.json switches each on for the folders it guards.
export default definePlugin({
  meta: { name: 'argo' },
  rules: {
    'api-type-only': apiTypeOnly,
    'cross-package-import': crossPackageImport,
    'database-client': databaseClient,
    'icon-size': iconSize,
    'json-parse-cast': jsonParseCast,
    'mock-environment': mockEnvironment,
    'no-internal-mock': noInternalMock,
    'vendor-name': vendorName,
  },
});
