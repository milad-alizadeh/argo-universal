import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// A test preloads this through NODE_OPTIONS, which also reaches the process the launcher starts.
const loadedModulesFile = process.env.ARGO_TEST_LOADED_MODULES;

if (loadedModulesFile)
  registerHooks({
    load(url, context, nextLoad) {
      appendFileSync(loadedModulesFile, `${url}\n`);

      return nextLoad(url, context);
    },
  });
