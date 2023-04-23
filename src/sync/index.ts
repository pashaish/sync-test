import "reflect-metadata";

import { initDependencies } from "deps";
import { container } from "tsyringe";

import { Sync } from "sync/sync";
import { Logger } from "logger/logger.interface";

void (async function () {
  await initDependencies();
  const logger: Logger = container.resolve(Logger);

  const sync = container.resolve(Sync);

  if (process.argv.includes("--full-reindex")) {
    logger.info("Full reindex mode");
    await sync.runFullReindex();
  } else {
    logger.info("Realtime sync mode");
    await sync.realtimeSync();
  }

  process.on("SIGINT", async () => {
    logger.info("SIGINT");
    await sync.stop();
    process.exit(0);
  });
})();
