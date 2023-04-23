import { MongoClient, Db } from "mongodb";

import { Config } from "config/config.interface";

export async function mongodbInit(config: Config) {
  const mongoClient = new MongoClient(config.mongodb.connection_uri);
  const mongoConnect = await mongoClient.connect();
  return mongoConnect.db(config.mongodb.db_name);
}

export type MongoDB = Db;
export const MongoDB = Symbol("MongoDB");
