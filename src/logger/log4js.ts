import log4js from "log4js";

import { Config } from "config/config.interface";

export async function log4jsInit(config: Config) {
  const logger = log4js.getLogger();
  logger.level = config.logger.level;
  return logger;
}
