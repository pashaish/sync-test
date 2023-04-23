import "reflect-metadata";
import { container } from "tsyringe";

import { App } from "app/app";
import { initDependencies } from "deps";

void (async function () {
  await initDependencies();
  await container.resolve(App).run();
})();
