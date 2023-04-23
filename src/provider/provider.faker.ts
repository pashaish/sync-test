import { faker } from "@faker-js/faker";
import { Config } from "config/config.interface";

import { Provider } from "provider/provider.interface";
import { Logger } from "logger/logger.interface";
import { sleep } from "utils/async";
import { randomRangeInt } from "utils/random";
import { inject, injectable } from "tsyringe";
import { UnconfirmedCustomer } from "db/types/customer";

@injectable()
export class FakerProvider implements Provider {
  constructor(
    @inject(Config) private config: Config,
    @inject(Logger) private logger: Logger
  ) {}

  public async *subscribe(): AsyncGenerator<
    UnconfirmedCustomer[],
    any,
    unknown
  > {
    while (true) {
      const batch = Array.from({
        length: randomRangeInt(...this.config.faker.batch_range),
      }).map(() => this.generateCustomer());

      this.logger.debug(`FakerProvider: generated ${batch.length} customers`);
      yield batch;
      await sleep(this.config.faker.filling_delay_ms);
    }
  }

  private generateCustomer(): UnconfirmedCustomer {
    return {
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      address: {
        line1: faker.address.streetAddress(),
        line2: faker.address.secondaryAddress(),
        postcode: faker.address.zipCode(),
        city: faker.address.city(),
        state: faker.address.state(),
        country: faker.address.country(),
      },
    };
  }
}
