import { Aggregator, AggregatorSetterResult, KeepAliveOptions } from './aggregator';
import { Subdomain, getRecentSubdomains } from '../core-db-pg/queries';
import { getTimesForBlockHeights } from '../bitcore-db/queries';


export type SubdomainsAggregatorOpts = {
  page: number;
};

export type SubdomainsAggregatorResult = (Subdomain & {
  timestamp: number;
})[];

class SubdomainsAggregator extends Aggregator<SubdomainsAggregatorResult, SubdomainsAggregatorOpts> {

  key(args: SubdomainsAggregatorOpts) {
    return `Subdomains:${args.page}`;
  }

  expiry() {
    return 15 * 60; // 15 minutes
  }

  async getInitialKeepAliveOptions(): Promise<KeepAliveOptions> {
    return {
      aggregatorKey: await this.keyWithTag({page: 0}),
      aggregatorArgs: {page: 0},
      interval: 10 * 60 // 10 minutes,
    };
  }

  async setter({ page }: SubdomainsAggregatorOpts): Promise<AggregatorSetterResult<SubdomainsAggregatorResult>> {
    const limit = 100;
    const subdomainsResult = await getRecentSubdomains(
      limit,
      page
    );
    const blockTimes = await getTimesForBlockHeights(
      subdomainsResult.map(sub => sub.blockHeight)
    );
    const subdomains = subdomainsResult.map(name => ({
      ...name,
      timestamp: blockTimes[name.blockHeight]
    }));
    return {
      shouldCacheValue: true,
      value: subdomains,
    };
  }
}

const subdomainsAggregator = new SubdomainsAggregator();

export default subdomainsAggregator;
