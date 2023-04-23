import { injectable } from "tsyringe";
import env from "dotenv";

import { Config } from "config/config.interface";

@injectable()
export class EnvConfig implements Config {
  constructor() {}

  public sync: Config["sync"] = {
    batch_size: 1000,
  };

  public logger: Config["logger"] = {
    level: "info",
  };

  public faker: Config["faker"] = {
    batch_range: [1, 10],
    filling_delay_ms: 200,
  };

  public mongodb: Config["mongodb"] = {
    connection_uri: "",
    db_name: "",
  };

  public async init() {
    env.config();
    this.faker.filling_delay_ms = Number(
      process.env.FAKER_FILLING_DELAY_MS ?? this.faker.filling_delay_ms
    );
    this.faker.batch_range = [
      Number(process.env.FAKER_BATCH_MIN ?? this.faker.batch_range[0]),
      Number(process.env.FAKER_BATCH_MAX ?? this.faker.batch_range[1]),
    ];
    this.mongodb.connection_uri =
      process.env.MONGODB_CONNECTION_URI ?? this.mongodb.connection_uri;
    this.mongodb.db_name = process.env.MONGODB_DB_NAME ?? this.mongodb.db_name;
    this.logger.level = process.env.LOGGER_LEVEL ?? this.logger.level;
    this.sync.batch_size = Number(
      process.env.SYNC_BATCH_SIZE ?? this.sync.batch_size
    );
  }
}
