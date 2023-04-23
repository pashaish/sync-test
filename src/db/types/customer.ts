import { ObjectId } from "mongodb";

export interface UnconfirmedCustomer {
  firstName: string;
  lastName: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface Customer extends UnconfirmedCustomer {
  id: string;
  createdAt: Date;
}
