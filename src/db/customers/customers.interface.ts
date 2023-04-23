import { Customer, UnconfirmedCustomer } from "db/types/customer";

export interface DBCustomers {
  addCustomers(customer: UnconfirmedCustomer[]): Promise<void>;
  getCustomersAfterRecord(
    fromRecord: Customer | null,
    toRecord: Customer | null,
    limit: number
  ): Promise<Customer[]>;
  subscribeUpdates(callback: (customer: Customer) => void): Promise<void>;
  subscribeInserts(callback: (customer: Customer) => void): Promise<void>;
  subscribeInsertsAndUpdates(
    callback: (customer: Customer) => Promise<void>
  ): Promise<void>;
  getLastCustomer(): Promise<Customer | null>;
}

export const DBCustomers = Symbol("DBCustomers");
