// import assert from 'assert';
import * as WasmUtils from './wasmMemUtils';

import type { WasmViews } from './wasmViews';
import { buildWasmMemViews } from './wasmViews';
import type { WasmModules, WasmImports } from './wasmLoader';
import { loadWasmModules } from './wasmLoader';

// import { syncStore, randColor, sleep } from './utils';
// import { BitImageRGBA } from './assets/images/bitImageRGBA';
// import { PngDecoderRGBA } from './assets/images/vivaxy-png/PngDecoderRGBA';
import {
  FONT_X_SIZE,
  FONT_Y_SIZE,
  FONT_SPACING,
} from '../../assets/fonts/font';
import { syncStore } from './../utils';

type WasmRunParams = {
  wasmMem: WebAssembly.Memory;
  wasmMemRegionsOffsets: WasmUtils.MemRegionsData;
  wasmMemRegionsSizes: WasmUtils.MemRegionsData;
  wasmWorkerHeapSize: number;
  mainWorkerIdx: number;
  workerIdx: number;
  numWorkers: number;
  frameWidth: number;
  frameHeight: number;
  numImages: number;
  // usePalette: boolean;
};

class WasmRun {
  protected params: WasmRunParams;
  protected wasmViews: WasmViews;
  protected wasmModules: WasmModules;

  public async init(params: WasmRunParams) {
    this.params = params;
    await this.initWasm();
  }

  private async initWasm(): Promise<void> {
    this.buildMemViews();
    await this.loadWasmModules();
  }

  protected buildMemViews(): void {
    const {
      wasmMem: mem,
      wasmMemRegionsOffsets: memOffsets,
      wasmMemRegionsSizes: memSizes,
    } = this.params;

    this.wasmViews = buildWasmMemViews(
      mem,
      memOffsets,
      memSizes,
    );

    const { workerIdx } = this.params;
    syncStore(this.wasmViews.syncArr, workerIdx, 0);
    syncStore(this.wasmViews.sleepArr, workerIdx, 0);
  }

  private buildWasmImports(): WasmImports {
    const {
      wasmMem: memory,
      wasmMemRegionsSizes: memSizes,
      wasmMemRegionsOffsets: memOffsets,
      wasmWorkerHeapSize: workerHeapSize,
    } = this.params;

    const { frameWidth, frameHeight, mainWorkerIdx, numWorkers, numImages, workerIdx } = this.params;

    const logf = (f: number) =>
      console.log(`[wasm] Worker [${workerIdx}]: ${f}`);
    const logi = (i: number) => {
      // console.trace();
      console.log(`[wasm] Worker [${workerIdx}]: ${i}`);
    };

    return {
      memory,
      frameWidth,
      frameHeight,
      frameBufferPtr: memOffsets[WasmUtils.MemRegions.FRAMEBUFFER_RGBA],
      syncArrayPtr: memOffsets[WasmUtils.MemRegions.SYNC_ARRAY],
      sleepArrayPtr: memOffsets[WasmUtils.MemRegions.SLEEP_ARRAY],
      mainWorkerIdx,
      workerIdx,
      numWorkers,
      workersHeapPtr: memOffsets[WasmUtils.MemRegions.WORKERS_HEAPS],
      workerHeapSize,
      heapPtr: memOffsets[WasmUtils.MemRegions.HEAP],
      bgColor: 0xff_00_00_00, // randColor(),
      // usePalette: this._config.usePalette ? 1 : 0,
      usePalette: 0,
      fontCharsPtr: memOffsets[WasmUtils.MemRegions.FONT_CHARS],
      fontCharsSize: memSizes[WasmUtils.MemRegions.FONT_CHARS],
      numImages,
      imagesIndexSize: memSizes[WasmUtils.MemRegions.IMAGES_INDEX],
      imagesIndexPtr: memOffsets[WasmUtils.MemRegions.IMAGES_INDEX],
      imagesDataPtr: memOffsets[WasmUtils.MemRegions.IMAGES],
      imagesDataSize: memSizes[WasmUtils.MemRegions.IMAGES],
      stringsDataPtr: memOffsets[WasmUtils.MemRegions.STRINGS],
      stringsDataSize: memSizes[WasmUtils.MemRegions.STRINGS],
      workersMemCountersPtr: memOffsets[WasmUtils.MemRegions.MEM_COUNTERS],
      workersMemCountersSize: memSizes[WasmUtils.MemRegions.MEM_COUNTERS],
      inputKeysPtr: memOffsets[WasmUtils.MemRegions.INPUT_KEYS],
      inputKeysSize: memSizes[WasmUtils.MemRegions.INPUT_KEYS],
      hrTimerPtr: memOffsets[WasmUtils.MemRegions.HR_TIMER],

      FONT_X_SIZE,
      FONT_Y_SIZE,
      FONT_SPACING,

      logi,
      logf,
    };
  }

  private async loadWasmModules(): Promise<void> {
    const wasmImports = this.buildWasmImports();
    this.wasmModules = await loadWasmModules(wasmImports);
  }

  get WasmViews(): WasmViews {
    return this.wasmViews;
  }

  get WasmModules(): WasmModules {
    return this.wasmModules;
  }
}

export { WasmRun, WasmRunParams };
