import { inject, injectable } from "tsyringe";

import { DBCustomers } from "db/customers/customers.interface";
import { MongoDB } from "db/mongodb";
import { Logger } from "logger/logger.interface";
import { Customer } from "db/types/customer";
import { Collection, ObjectId } from "mongodb";

@injectable()
export class MongoDBCustomers implements DBCustomers {
  private collection: Collection;

  constructor(
    @inject(MongoDB) private mongoDB: MongoDB,
    @inject(Logger) private logger: Logger
  ) {
    this.collection = this.mongoDB.collection("customers");
  }

  public async getCustomersAfterRecord(
    fromRecord: (Customer & { _id?: ObjectId }) | null,
    toRecord: (Customer & { _id?: ObjectId }) | null,
    limit: number
  ): Promise<Customer[]> {
    let request: {
      _id?: {
        $gt?: ObjectId;
        $lte?: ObjectId;
      };
    } = {};

    if (fromRecord || toRecord) {
      request._id = {};
      if (fromRecord) {
        request._id.$gt = fromRecord._id ?? new ObjectId(fromRecord.id);
      }

      if (toRecord) {
        request._id.$lte = toRecord._id ?? new ObjectId(toRecord.id);
      }
    }

    const customers = await this.collection
      .find(request)
      .sort({ _id: 1 })
      .limit(limit)
      .toArray();

    return customers.map<Customer>((customer) => ({
      id: customer._id.toString(),
      address: customer.address,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      createdAt: customer.createdAt,
    }));
  }

  public async addCustomers(customers: Customer[]): Promise<void> {
    await this.collection.insertMany(
      customers.map((customer) => ({
        ...customer,
        createdAt: new Date(),
      }))
    );

    this.logger.debug(`MongoDBCustomers: added ${customers.length} customers`);
  }

  public async subscribeUpdates(
    callback: (customer: Customer) => void
  ): Promise<void> {
    const changeStream = this.collection.watch([
      { $match: { operationType: "replace" } },
    ]);

    changeStream.on("change", (change) => {
      if (change.operationType === "replace") {
        const customer = change.fullDocument as Customer;
        customer.id = change.fullDocument._id.toString();
        callback(customer);
      }
    });
  }

  public async subscribeInserts(
    callback: (customer: Customer) => void
  ): Promise<void> {
    const changeStream = this.collection.watch([
      { $match: { operationType: "insert" } },
    ]);

    changeStream.on("change", (change) => {
      if (change.operationType === "insert") {
        const customer = change.fullDocument as Customer;
        customer.id = change.fullDocument._id.toString();
        callback(customer);
      }
    });
  }

  public async subscribeInsertsAndUpdates(
    callback: (customer: Customer) => Promise<void>
  ): Promise<void> {
    const changeStream = this.collection.watch([
      { $match: { operationType: { $in: ["insert", "replace"] } } },
    ]);

    changeStream.on("change", async (change) => {
      if (
        change.operationType === "insert" ||
        change.operationType === "replace"
      ) {
        const customer = change.fullDocument as Customer;
        customer.id = change.fullDocument._id.toString();
        await callback(customer);
      }
    });
  }

  public async getLastCustomer(): Promise<Customer | null> {
    const customer = await this.collection.findOne({}, { sort: { _id: -1 } });
    return customer as Customer | null;
  }
}
