import * as moment from 'moment';
import * as accounting from 'accounting';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import NameOperations, { NameOp } from './name-ops-v2';

import { Aggregator } from './aggregator';

import NameCounts from './total-names';

import { getUnlockedSupply } from '../core-db-pg/queries';
import { microStacksToStacks, TOTAL_STACKS } from '../utils';
import TotalSupplyAggregator, { TotalSupplyResult } from './total-supply';

export type HomeInfoResult = {
  totalStacks: string;
  unlockedSupply: string;
  unlockedSupplyFormatted: string;
  nameTotals: any;
  nameOperationsOverTime: any[];
  nameOperations: NameOp[];
};

class HomeInfo extends Aggregator<HomeInfoResult> {
  key() {
    return 'HomeInfo:v2';
  }

  async setter() {
    const [counts, nameOperations] = await Promise.all([
      NameCounts.fetch(),
      NameOperations.setter()
    ]);

    const startCount = counts.total - nameOperations.length;
    let currentCount = startCount;
    const ticks: Record<number, { names: number; date: string }> = {};
    const sortedNames = sortBy(nameOperations.slice(), nameOp => nameOp.time);

    sortedNames.forEach(nameOp => {
      const { time } = nameOp;
      currentCount += 1;
      ticks[time] = {
        names: currentCount,
        date: moment(time)
          .utc()
          .format('MM/DD/YYYY h:mm UTC')
      };
    });

    const keys = Object.keys(ticks)
      .map(date => parseInt(date, 10))
      .sort();

    const nameOperationsOverTime = keys.map(time => {
      const tick = ticks[time];
      return {
        ...tick,
        x: time,
        y: tick.names,
        time
      };
    });

    const totalSupplyInfo: TotalSupplyResult = await TotalSupplyAggregator.fetch();
    return {
      totalStacks: totalSupplyInfo.totalStacksFormatted,
      unlockedSupply: totalSupplyInfo.unlockedSupply,
      unlockedSupplyFormatted: totalSupplyInfo.unlockedSupplyFormatted,
      nameTotals: counts,
      nameOperationsOverTime,
      nameOperations
    };
  }

  expiry() {
    return 10 * 60; // 10 minutes
  }
}

export default new HomeInfo();
