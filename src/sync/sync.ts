import { inject, injectable } from "tsyringe";
import { debounce } from "lodash";

import { DBCustomers } from "db/customers/customers.interface";
import { DBCustomersAnonymised } from "db/customers_anonymised/customers_anonymised.interface";
import { Config } from "config/config.interface";
import { Customer } from "db/types/customer";
import { Logger } from "logger/logger.interface";

@injectable()
export class Sync {
  private bufferCustomers: Customer[] = [];
  private bufferTimeoutIndex: NodeJS.Timeout | null = null;
  private isStopped = false;
  private isScanning = true;
  private insertsCount = 0;
  private rtSyncStartTime = Date.now();
  private fullReindex = false;
  private lastAnCustomer: Customer | null = null;

  private debOnInsertCustomer: (
    customer: Customer,
    isDeb?: boolean
  ) => Promise<void> | undefined;

  constructor(
    @inject(DBCustomers)
    private customers: DBCustomers,

    @inject(DBCustomersAnonymised)
    private customersAnonymised: DBCustomersAnonymised,

    @inject(Config)
    private config: Config,

    @inject(Logger)
    private logger: Logger
  ) {
    this.onInsertCustomer = this.onInsertCustomer.bind(this);
    this.debOnInsertCustomer = debounce(this.onInsertCustomer, 1000);
  }

  public async realtimeSync() {
    this.fullReindex = false;
    return this.sync();
  }

  public async runFullReindex() {
    this.fullReindex = true;
    await this.sync();
    await this.stop();
    process.exit(0);
  }

  public async stop() {
    this.isStopped = true;
    await this.applyBuffer();
    this.logger.info("Sync: stop");
  }

  private async sync() {
    this.lastAnCustomer = null;
    this.logger.debug(
      "Sync: start",
      this.fullReindex ? "full reindex" : "realtime sync"
    );

    if (!this.fullReindex) {
      await this.enableRealTimeSync();
    }

    let customerFrom = this.lastAnCustomer;
    const customerTo = await this.customers.getLastCustomer();

    if (this.fullReindex) {
      customerFrom = null;
    }

    await this.scanRecords(customerFrom, customerTo, async (newCustomers) => {
      this.logger.debug("Sync: get new customers by scan", newCustomers.length);
      await this.addCustomers(newCustomers);
    });

    this.isScanning = false;
    this.logger.debug("Sync: scan finished");
  }

  private async enableRealTimeSync() {
    this.lastAnCustomer = await this.customersAnonymised.getLastCustomer();

    this.customers.subscribeUpdates(async (customer) => {
      await this.addCustomers([customer]);
    });

    this.rtSyncStartTime = Date.now();
    this.customers.subscribeInserts(this.onInsertCustomer);
  }

  private async onInsertCustomer(customer: Customer, isDeb = false) {
    if (!isDeb) {
      this.debOnInsertCustomer(customer, true);
    }

    if (this.isScanning) {
      return;
    }

    const curTime = Date.now();

    if (
      this.insertsCount < this.config.sync.batch_size &&
      curTime - this.rtSyncStartTime < 1000
    ) {
      this.insertsCount++;
      return;
    }

    this.rtSyncStartTime = curTime;

    await this.scanRecords(
      await this.customersAnonymised.getLastCustomer(),
      null,
      async (newCustomers) => {
        await this.addCustomers(newCustomers);
      }
    );
    this.insertsCount = 0;
  }

  private async addCustomers(customers: Customer[]) {
    if (this.isStopped) {
      return;
    }

    this.bufferCustomers.push(...customers);
    if (
      this.bufferCustomers.length >= this.config.sync.batch_size ||
      (this.fullReindex && this.bufferCustomers.length > 0)
    ) {
      clearTimeout(this.bufferTimeoutIndex ?? -1);
      this.bufferTimeoutIndex = null;
      await this.applyBuffer();
    }

    if (!this.bufferTimeoutIndex) {
      this.bufferTimeoutIndex = setTimeout(async () => {
        this.bufferTimeoutIndex = null;
        if (this.bufferCustomers.length > 0) {
          await this.applyBuffer();
        }
      }, 1000);
    }
  }

  private async applyBuffer() {
    if (this.bufferCustomers.length > 0) {
      const applyCustomers = this.bufferCustomers.splice(
        0,
        this.config.sync.batch_size
      );
      this.logger.debug(
        "Sync: add customers to anonymised",
        applyCustomers.length
      );
      await this.customersAnonymised.addCustomers(applyCustomers);
    }
  }

  private async scanRecords(
    from: Customer | null,
    to: Customer | null,
    cb: (customers: Customer[]) => Promise<void>
  ) {
    let lastCustomer = from;
    let readOldRecords = true;

    while (readOldRecords) {
      const newCustomers: Customer[] =
        await this.customers.getCustomersAfterRecord(
          lastCustomer,
          to,
          this.config.sync.batch_size
        );

      if (newCustomers.length === 0) {
        readOldRecords = false;
      }

      await cb(newCustomers);
      lastCustomer = newCustomers[newCustomers.length - 1] ?? lastCustomer;
    }
  }
}
