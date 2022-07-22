import { StatsPanel } from './statsPanel';
import { StatsNames, StatsValues } from '../../engine/common';

// TODO not used
// const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

// TODO not used
// function bytesToSize(bytes: number, nFractDigit: number){
//   if (bytes === 0) return 'n/a';
//   nFractDigit	= nFractDigit !== undefined ? nFractDigit : 0;
//   const precision = Math.pow(10, nFractDigit);
//   const i = Math.floor(Math.log(bytes) / Math.log(1024));
//   return Math.round(bytes*precision / Math.pow(1024, i))/precision + ' ' + sizes[i];
// }

const ONE_MB = 1048576;

class MemoryStatsPanel extends StatsPanel {

  constructor() {
    super(StatsNames.MEM, '#FF0', '#220');
  }

  update(numBytes: number) {
    super.update(numBytes / ONE_MB);
  }

}

export { MemoryStatsPanel };
