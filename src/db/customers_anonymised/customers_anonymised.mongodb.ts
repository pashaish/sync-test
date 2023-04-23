import { Collection, ObjectId } from "mongodb";
import { inject, injectable } from "tsyringe";
import crypto from "crypto";

import { MongoDB } from "db/mongodb";
import { Customer, UnconfirmedCustomer } from "db/types/customer";
import { Logger } from "logger/logger.interface";
import { DBCustomersAnonymised } from "./customers_anonymised.interface";

@injectable()
export class MongoDBCustomersAnonymised implements DBCustomersAnonymised {
  private collection: Collection;

  constructor(
    @inject(MongoDB) private mongoDB: MongoDB,
    @inject(Logger) private logger: Logger
  ) {
    this.collection = this.mongoDB.collection("customers_anonymised");
    this.anonymizeCustomer = this.anonymizeCustomer.bind(this);
  }

  public async getLastCustomer(offset?: number): Promise<Customer | null> {
    const [customer] = (await this.collection
      .find({})
      .sort({ _id: -1 })
      .skip(offset ?? 0)
      .limit(1)
      .toArray()) as object[];

    return customer as Customer | null;
  }

  public async addCustomers(customers: Customer[]): Promise<void> {
    await this.collection.bulkWrite(
      customers.map((customer) => ({
        updateOne: {
          filter: { _id: new ObjectId(customer.id) },
          update: { $set: this.anonymizeCustomer(customer) },
          upsert: true,
        },
      }))
    );
  }

  private anonymizeCustomer(
    customer: Customer
  ): UnconfirmedCustomer & Record<string, unknown> {
    return {
      _id: new ObjectId(customer.id),
      createdAt: customer.createdAt,
      firstName: this.annStr(customer.firstName),
      lastName: this.annStr(customer.lastName),
      email: this.annEmail(customer.email),
      address: {
        city: customer.address.city,
        country: customer.address.country,
        line1: this.annStr(customer.address.line1),
        line2: this.annStr(customer.address.line2),
        postcode: this.annStr(customer.address.postcode),
        state: customer.address.state,
      },
    };
  }

  private annStr(str: string): string {
    return crypto.createHash("sha256").update(str).digest("hex").slice(0, 8);
  }

  private annEmail(email: string): string {
    const [local, domain] = email.split("@");
    return `${this.annStr(local)}@${domain}`;
  }
}
