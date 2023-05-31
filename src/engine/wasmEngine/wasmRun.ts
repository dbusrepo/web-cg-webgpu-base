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
  // usePalette: boolean;
  wasmMem: WebAssembly.Memory;
  wasmMemRegionsSizes: WasmUtils.WasmMemRegionsData;
  wasmMemRegionsOffsets: WasmUtils.WasmMemRegionsData;
  wasmWorkerHeapSize: number;
  mainWorkerIdx: number;
  workerIdx: number;
  numWorkers: number;
  numImages: number;
  surface0sizes: [number, number];
  surface1sizes: [number, number];
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
      surface0sizes,
      surface1sizes,
      mainWorkerIdx,
      numWorkers,
      numImages,
      workerIdx,
    } = this.params;

    const logf = (f: number) => console.log(`[wasm] Worker [${workerIdx}]: ${f}`);

    const logi = (i: number) => {
      // console.trace();
      console.log(`[wasm] Worker [${workerIdx}]: ${i}`);
    };

    const wasmImports: WasmImports = {
      memory,

      rgbaSurface0ptr: memOffsets[WasmUtils.MemRegionsEnum.RGBA_SURFACE_0],
      rgbaSurface0width: surface0sizes[0],
      rgbaSurface0height: surface0sizes[1],

      rgbaSurface1ptr: memOffsets[WasmUtils.MemRegionsEnum.RGBA_SURFACE_1],
      rgbaSurface1width: surface1sizes[0],
      rgbaSurface1height: surface1sizes[1],

      syncArrayPtr: memOffsets[WasmUtils.MemRegionsEnum.SYNC_ARRAY],
      sleepArrayPtr: memOffsets[WasmUtils.MemRegionsEnum.SLEEP_ARRAY],
      mainWorkerIdx,
      workerIdx,
      numWorkers,
      workersHeapPtr: memOffsets[WasmUtils.MemRegionsEnum.WORKERS_HEAPS],
      workerHeapSize,
      heapPtr: memOffsets[WasmUtils.MemRegionsEnum.HEAP],
      bgColor: 0xff_00_00_00, // randColor(),
      // usePalette: this._config.usePalette ? 1 : 0,
      // usePalette: 0,
      fontCharsPtr: memOffsets[WasmUtils.MemRegionsEnum.FONT_CHARS],
      fontCharsSize: memSizes[WasmUtils.MemRegionsEnum.FONT_CHARS],
      numImages,
      imagesIndexSize: memSizes[WasmUtils.MemRegionsEnum.IMAGES_INDEX],
      imagesIndexPtr: memOffsets[WasmUtils.MemRegionsEnum.IMAGES_INDEX],
      imagesDataPtr: memOffsets[WasmUtils.MemRegionsEnum.IMAGES],
      imagesDataSize: memSizes[WasmUtils.MemRegionsEnum.IMAGES],
      stringsDataPtr: memOffsets[WasmUtils.MemRegionsEnum.STRINGS],
      stringsDataSize: memSizes[WasmUtils.MemRegionsEnum.STRINGS],
      workersMemCountersPtr: memOffsets[WasmUtils.MemRegionsEnum.MEM_COUNTERS],
      workersMemCountersSize: memSizes[WasmUtils.MemRegionsEnum.MEM_COUNTERS],
      inputKeysPtr: memOffsets[WasmUtils.MemRegionsEnum.INPUT_KEYS],
      inputKeysSize: memSizes[WasmUtils.MemRegionsEnum.INPUT_KEYS],
      hrTimerPtr: memOffsets[WasmUtils.MemRegionsEnum.HR_TIMER],

      FONT_X_SIZE,
      FONT_Y_SIZE,
      FONT_SPACING,

      logi,
      logf,
    };

    return wasmImports;
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

export type { WasmRunParams };
export { WasmRun };
