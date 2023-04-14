// import assert from 'assert';
// import { fileTypeFromBuffer } from 'file-type';
import * as WasmUtils from './wasmMemUtils';
import { WasmModules, WasmImports, loadWasmModules } from './wasmLoader';
// import { syncStore, randColor, sleep } from './utils';
// import { BitImageRGBA } from './assets/images/bitImageRGBA';
// import { PngDecoderRGBA } from './assets/images/vivaxy-png/PngDecoderRGBA';
import {
  FONT_X_SIZE,
  FONT_Y_SIZE,
  FONT_SPACING,
} from '../../assets/fonts/font';
import { syncStore } from './../utils';

type WasmViews = WasmUtils.views.WasmViews;

type WasmRunConfig = {
  wasmMem: WebAssembly.Memory;
  wasmMemRegionsOffsets: WasmUtils.MemRegionsData;
  wasmMemRegionsSizes: WasmUtils.MemRegionsData;
  wasmWorkerHeapSize: number;
  workerIdx: number;
  numWorkers: number;
  frameWidth: number;
  frameHeight: number;
  numImages: number;
  // usePalette: boolean;
};

class WasmRun {
  protected _cfg: WasmRunConfig;
  protected _wasmViews: WasmViews;
  protected _wasmModules: WasmModules;

  public async init(
    workerCfg: WasmRunConfig,
  ): Promise<void> {
    this._cfg = workerCfg;
    await this._initWasm();
  }

  private async _initWasm(): Promise<void> {
    this._buildWasmMemViews();
    await this.loadWasmModules();
  }

  protected _buildWasmMemViews(): void {
    const {
      wasmMem: mem,
      wasmMemRegionsOffsets: memOffsets,
      wasmMemRegionsSizes: memSizes,
    } = this._cfg;

    this._wasmViews = WasmUtils.views.buildWasmMemViews(
      mem,
      memOffsets,
      memSizes,
    );

    const { workerIdx } = this._cfg;
    syncStore(this._wasmViews.syncArr, workerIdx, 0);
    syncStore(this._wasmViews.sleepArr, workerIdx, 0);
  }

  private buildWasmImports(): WasmImports {
    const {
      wasmMem: memory,
      wasmMemRegionsSizes: memSizes,
      wasmMemRegionsOffsets: memOffsets,
      wasmWorkerHeapSize: workerHeapSize,
    } = this._cfg;

    const { frameWidth, frameHeight, numWorkers, numImages, workerIdx } = this._cfg;

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
      workersMemCountersPtr:
        memOffsets[WasmUtils.MemRegions.WORKERS_MEM_COUNTERS],
      workersMemCountersSize:
        memSizes[WasmUtils.MemRegions.WORKERS_MEM_COUNTERS],
      inputKeysPtr: memOffsets[WasmUtils.MemRegions.INPUT_KEYS],
      inputKeysSize: memSizes[WasmUtils.MemRegions.INPUT_KEYS],

      FONT_X_SIZE,
      FONT_Y_SIZE,
      FONT_SPACING,

      logi,
      logf,
    };
  }

  private async loadWasmModules(): Promise<void> {
    const wasmImports = this.buildWasmImports();
    this._wasmModules = await loadWasmModules(wasmImports);
  }

  get wasmViews(): WasmViews {
    return this._wasmViews;
  }

  get wasmModules(): WasmModules {
    return this._wasmModules;
  }
}

export { WasmRun, WasmRunConfig };
