import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// Preloaded into a CLI process by a test: appends the URL of each module the process loads to the file named here.
const record = process.env.ARGO_TEST_LOADED_MODULES;

if (record)
  registerHooks({
    load(url, context, nextLoad) {
      appendFileSync(record, `${url}\n`);

      return nextLoad(url, context);
    },
  });
