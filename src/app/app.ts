import { inject, injectable } from "tsyringe";

import { Logger } from "logger/logger.interface";
import { Provider } from "provider/provider.interface";
import { DBCustomers } from "db/customers/customers.interface";

@injectable()
export class App {
  constructor(
    @inject(Provider) private provider: Provider,
    @inject(DBCustomers) private dbCustomers: DBCustomers,
    @inject(Logger) private logger: Logger
  ) {}

  public async run() {
    this.logger.info("App: start");
    for await (const batch of this.provider.subscribe()) {
      this.dbCustomers.addCustomers(batch);
    }
  }
}
