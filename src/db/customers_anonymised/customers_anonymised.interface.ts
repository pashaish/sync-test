import { Customer } from "db/types/customer";

export interface DBCustomersAnonymised {
  getLastCustomer(offset?: number): Promise<Customer | null>;
  addCustomers(customers: Customer[]): Promise<void>;
}

export const DBCustomersAnonymised = Symbol("DBCustomersAnonymised");
