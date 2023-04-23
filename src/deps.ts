import { container } from "tsyringe";

import { Config } from "config/config.interface";
import { EnvConfig } from "config/config.env";
import { MongoDB, mongodbInit } from "db/mongodb";
import { DBCustomers } from "db/customers/customers.interface";
import { MongoDBCustomers } from "db/customers/customers.mongodb";
import { Logger } from "logger/logger.interface";
import { log4jsInit } from "logger/log4js";
import { Provider } from "./provider/provider.interface";
import { FakerProvider } from "./provider/provider.faker";
import { DBCustomersAnonymised } from "db/customers_anonymised/customers_anonymised.interface";
import { MongoDBCustomersAnonymised } from "db/customers_anonymised/customers_anonymised.mongodb";

export async function initDependencies() {
  const config = container.resolve(EnvConfig);
  await config.init();
  container.register(Config, { useValue: config });

  container.register(MongoDB, { useValue: await mongodbInit(config) });
  container.registerSingleton(DBCustomers, MongoDBCustomers);
  container.registerSingleton(
    DBCustomersAnonymised,
    MongoDBCustomersAnonymised
  );

  container.register(Logger, { useValue: await log4jsInit(config) });

  container.registerSingleton(Provider, FakerProvider);
}
