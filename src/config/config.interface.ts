export interface Config {
  init(): Promise<void>;
  faker: {
    batch_range: [number, number];
    filling_delay_ms: number;
  };
  mongodb: {
    connection_uri: string;
    db_name: string;
  };
  logger: {
    level: string;
  };
  sync: {
    batch_size: number;
  };
}

export const Config = Symbol("Config");
