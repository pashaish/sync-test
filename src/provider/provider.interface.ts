import { UnconfirmedCustomer } from "db/types/customer";

export interface Provider {
  subscribe(): AsyncGenerator<UnconfirmedCustomer[]>;
}

export const Provider = Symbol("Provider");
