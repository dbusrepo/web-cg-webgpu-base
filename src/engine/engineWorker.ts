import assert from 'assert';
import { fileTypeFromBuffer } from 'file-type';
import * as WasmMemUtils from './wasmMemUtils';
import { WasmModules, WasmInput, loadWasmModules } from './initWasm';
import { syncStore, randColor, sleep } from './utils';
import * as loadUtils from './loadUtils';
import { BitImage } from './assets/images/bitImage';
import { BitImageRGBA } from './assets/images/bitImageRGBA';
import { PngDecoderRGBA } from './assets/images/vivaxy-png/PngDecoderRGBA';

// const ASSETS_PATH = '../asset';
// const IMAGES_PATH = `${ASSETS_PATH}/images`;

// import myImgUrl from '../asset/images/samplePNGImage.png';

type WorkerConfig = {
  workerIdx: number;
  numWorkers: number;
  frameWidth: number;
  frameHeight: number;
  imageUrls: string[];
  usePalette: boolean;
};

type WorkerInitImagesData = {
  totalImagesSize: number; // in bytes
  imagesSizes: [number, number][];
};

type WorkerInitData = {} & WorkerInitImagesData;

type WorkerWasmMemConfig = {
  wasmMem: WebAssembly.Memory;
  wasmMemStartOffset: number;
  wasmMemStartSize: number;
  wasmMemRegionsOffsets: WasmMemUtils.MemRegionsData;
  wasmMemRegionsSizes: WasmMemUtils.MemRegionsData;
  wasmWorkerHeapSize: number;
  wasmImagesIndexOffset: number; // images region starts here
  wasmWorkerImagesOffsets: number[]; // for each worker gives the offsets of its images
  wasmWorkerImagesSize: number[]; // for each worker gives the total size of its images
  wasmImagesSizes: [number, number][]; // for each image gives its sizes [w, h]
  wasmImagesOffsets: number[]; // for each image gives its offsets wrt the start of the images region (so it consider the index area)
};

type AssetsBuffers = {
  images: ArrayBuffer[];
};

class EngineWorker {
  private _config: WorkerConfig;
  private _wasmMemConfig: WorkerWasmMemConfig;
  private _workerImages: BitImage[]; // the images loaded by this worker during init

  private _wasmInitInput: WasmInput;
  private _wasmModules: WasmModules;
  private _wasmMemUI8: Uint8Array;
  private _wasmRgbaFramebuffer: Uint8ClampedArray;
  private _wasmSyncArr: Int32Array;
  private _wasmSleepArr: Int32Array;
  private _wasmImagesIndex: Uint32Array;
  private _wasmImagesData: Uint8Array;
  private _sab: SharedArrayBuffer;

  public async init(config: WorkerConfig): Promise<WorkerInitData> {
    this._config = config;
    // load png as arraybuffer
    // const imgUrl = (await import('../asset/images/samplePNGImage.png')).default;
    // const imgBuffer = await loadUtils.loadResAsArrayBuffer(imgUrl);
    // const pngDecoder = new PngDecoder24();
    // const [w, h] = pngDecoder.readSize(imgBuffer);
    // console.log(w, h);
    const assetsBuffers = await this._loadAssets();
    return { ...(await this._getImagesInitData(assetsBuffers.images)) };
  }

  private async _getImagesInitData(
    imageBuffers: ArrayBuffer[],
  ): Promise<WorkerInitImagesData> {
    const imagesSizes = await Promise.all(
      imageBuffers.map(async (imgBuffer) => {
        const fileType = await fileTypeFromBuffer(imgBuffer);
        if (!fileType) {
          throw new Error(`_getImagesInitData: file type not found`);
        }
        let imgSizes; // [w,h]
        switch (fileType.ext) {
          case 'png':
            {
              const pngDecoder = new PngDecoderRGBA();
              imgSizes = pngDecoder.readSizes(imgBuffer);
            }
            break;
          default:
            throw new Error(
              `_loadImage does not support ${fileType.ext} loading`,
            );
        }
        return imgSizes;
      }),
    );
    let totalImagesSize = 0;
    imagesSizes.forEach(([w, h]) => {
      const imageSize = w * h * this._getBytesPerPixel();
      totalImagesSize += imageSize;
    });
    return { totalImagesSize, imagesSizes };
  }

  private _getBytesPerPixel(): number {
    const bpp = this._config.usePalette ? 1 : 4;
    return bpp;
  }

  private async _loadImageBuffers(): Promise<ArrayBuffer[]> {
    const imageBuffers = await Promise.all(
      this._config.imageUrls.map(async (url) =>
        loadUtils.loadResAsArrayBuffer(url),
      ),
    );
    return imageBuffers;
  }

  private async _loadAssets(): Promise<AssetsBuffers> {
    const imageBuffers = await this._loadImageBuffers();
    await this._loadImages(imageBuffers);
    return {
      images: imageBuffers,
    };
  }

  private async _loadImages(imageBuffers: ArrayBuffer[]): Promise<void> {
    this._workerImages = await Promise.all(
      imageBuffers.map(async (imgBuffer) => this._loadImage(imgBuffer)),
    );
  }

  private async _loadImage(imageBuffer: ArrayBuffer): Promise<BitImage> {
    // TODO check use palette ?
    const fileType = await fileTypeFromBuffer(imageBuffer);
    if (!fileType) {
      throw new Error(`_loadImage: file type not found`);
    }
    switch (fileType.ext) {
      case 'png': {
        const pngDecoder = new PngDecoderRGBA();
        const bitImage = new BitImageRGBA();
        pngDecoder.read(imageBuffer, bitImage);
        return bitImage;
      }
      // break;
      default:
        throw new Error(`_loadImage does not support ${fileType.ext} loading`);
    }
  }

  public async initWasm(config: WorkerWasmMemConfig): Promise<void> {
    this._wasmMemConfig = config;
    this._initWasmMemViews();
    this._initWasmMem();
    await this.initWasmModules();
  }

  private _initWasmMemViews(): void {
    const {
      wasmMem,
      wasmMemStartOffset,
      wasmMemStartSize,
      wasmMemRegionsOffsets: memOffsets,
      wasmMemRegionsSizes: memSizes,
    } = this._wasmMemConfig;

    const { workerIdx } = this._config;

    const wasmMemSize = wasmMemStartOffset + wasmMemStartSize;
    this._wasmMemUI8 = new Uint8Array(wasmMem.buffer, 0, wasmMemSize);

    const rgbaFrameBufferRegion = WasmMemUtils.MemRegions.RGBA_FRAMEBUFFER;
    this._wasmRgbaFramebuffer = new Uint8ClampedArray(
      wasmMem.buffer,
      memOffsets[rgbaFrameBufferRegion],
      memSizes[rgbaFrameBufferRegion],
    );

    const syncArrayRegion = WasmMemUtils.MemRegions.SYNC_ARRAY;
    this._wasmSyncArr = new Int32Array(
      wasmMem.buffer,
      memOffsets[syncArrayRegion],
      memSizes[syncArrayRegion] / Int32Array.BYTES_PER_ELEMENT,
    );
    syncStore(this._wasmSyncArr, workerIdx, 0);

    const sleepArrayRegion = WasmMemUtils.MemRegions.SLEEP_ARRAY;
    this._wasmSleepArr = new Int32Array(
      wasmMem.buffer,
      memOffsets[sleepArrayRegion],
      memSizes[sleepArrayRegion] / Int32Array.BYTES_PER_ELEMENT,
    );
    syncStore(this._wasmSleepArr, workerIdx, 0);

    const imagesRegion = WasmMemUtils.MemRegions.IMAGES;
    const imagesIndexSize = WasmMemUtils.getImageIndexSize(
      this._wasmMemConfig.wasmWorkerImagesOffsets.length,
    );

    this._wasmImagesIndex = new Uint32Array(
      wasmMem.buffer,
      memOffsets[imagesRegion],
      imagesIndexSize / Uint32Array.BYTES_PER_ELEMENT,
    );

    // console.log('image index: ', this._wasmImagesIndex);
    // console.log('image index offset: ', memOffsets[imagesRegion]);

    this._wasmImagesData = new Uint8Array(
      wasmMem.buffer,
      memOffsets[imagesRegion] + imagesIndexSize,
      memSizes[imagesRegion] - imagesIndexSize,
    );
  }

  private _initWasmMem() {
    console.log('Init wasm memory...');
    if (this._config.workerIdx === 0) {
      // first worker writes the images index
      // console.log('images offsets: ', this._wasmMemConfig.wasmImagesOffsets);
      // console.log(this._wasmMemConfig.wasmImagesSizes);

      // this._wasmImagesIndex[0] = 13;
      // sleep(this._wasmSleepArr, 0, 50);

      // writeImagesIndex(this._wasmImagesIndex);

      WasmMemUtils.writeImageIndex(
        this._wasmImagesIndex,
        this._wasmMemConfig.wasmImagesOffsets,
        this._wasmMemConfig.wasmImagesSizes,
        this._getBytesPerPixel(),
      );

      // this._wasmImagesIndex[0] = 12;
      // Atomics.store(this._wasmImagesIndex, 0, 12);

      // Atomics.store(this._wasmImagesIndex, 0, 12);
      // console.log(this._config.workerIdx, this._wasmImagesIndex);

      // console.log('index[0]: ', new DataView(this._wasmImagesIndex.buffer).getUint32(0));
      // console.log('index[0]: ', Atomics.load(this._wasmImagesIndex, 0));
      // console.log('index[0]: ', this._wasmImagesIndex[0]);

      // ***
      // Atomics.store(this._wasmImagesIndex, 0, 13);
      // console.log(this._config.workerIdx, Atomics.load(this._wasmImagesIndex, 0));

      // const val = new DataView(
      //   this._wasmMemConfig.wasmMem.buffer,
      //   this._wasmMemConfig.wasmMemRegionsOffsets[WasmMemUtils.MemRegions.IMAGES],
      //   4,
      // ).getUint32(0);

      // const typArr = new Uint32Array(
      //   this._wasmMemConfig.wasmMem.buffer,
      //   this._wasmMemConfig.wasmMemRegionsOffsets[WasmMemUtils.MemRegions.IMAGES],
      //   6
      // );

      // const val = typArr[0];

      // console.log(this._config.workerIdx, new DataView(this._wasmMemConfig.wasmMem.buffer, 321056).getUint32(0));
      // console.log(this._config.workerIdx, val);
      // console.log(this._config.workerIdx, this._wasmImagesIndex[0]);
      // console.log(this._config.workerIdx, Atomics.load(this._wasmImagesIndex, 0));

      // console.log(this._config.workerIdx, Atomics.load(this._wasmImagesIndex, 0));

      // this._sab = new SharedArrayBuffer(4);
      // Atomics.store(new Uint32Array(this._sab, 0, 1), 0, 22);
      // console.log(this._config.workerIdx, new Uint32Array(this._sab, 0, 1));
    }
    // each worker writes the loaded images buffers to wasm mem: rgba or palette indexes

    const workerImagesOffset =
      this._wasmImagesData.byteOffset +
      this._wasmMemConfig.wasmWorkerImagesOffsets[this._config.workerIdx];
    // console.log('images offset: ', workerImagesOffset);
    // console.log('images sizes: ', this._wasmMemConfig.wasmWorkerImagesSize[this._config.workerIdx]);

    const workerImagesData = new Uint8Array(
      this._wasmImagesData.buffer,
      workerImagesOffset,
      this._wasmMemConfig.wasmWorkerImagesSize[this._config.workerIdx],
    );
    // console.log(workerImagesData);

    for (let i = 0, imgOffset = 0; i < this._workerImages.length; ++i) {
      const { pixels } = this._workerImages[i];
      workerImagesData.set(pixels, imgOffset);
      imgOffset += pixels.length;
    }
    // sleep(this._wasmSleepArr, 0, 50);
    // console.log(this._config.workerIdx, workerImagesData);
  }

  private async initWasmModules(): Promise<void> {
    const {
      wasmMem: memory,
      wasmMemRegionsOffsets: memOffsets,
      wasmWorkerHeapSize: workerHeapSize,
    } = this._wasmMemConfig;

    const { frameWidth, frameHeight, numWorkers, workerIdx } = this._config;

    const wasmInput: WasmInput = {
      memory,
      frameWidth,
      frameHeight,
      frameBufferOffset: memOffsets[WasmMemUtils.MemRegions.RGBA_FRAMEBUFFER],
      syncArrayOffset: memOffsets[WasmMemUtils.MemRegions.SYNC_ARRAY],
      sleepArrayOffset: memOffsets[WasmMemUtils.MemRegions.SLEEP_ARRAY],
      imagesIndexOffset: memOffsets[WasmMemUtils.MemRegions.IMAGES],
      numImages: this._wasmMemConfig.wasmImagesSizes.length,
      workerIdx,
      numWorkers,
      workersHeapOffset: memOffsets[WasmMemUtils.MemRegions.WORKERS_HEAPS],
      workerHeapSize,
      heapOffset: memOffsets[WasmMemUtils.MemRegions.HEAP],
      bgColor: randColor(),
      logf: (f: number) => console.log(`Worker [${workerIdx}]: ${f}`),
      logi: (i: number) => console.log(`Worker [${workerIdx}]: ${i}`),
    };

    this._wasmInitInput = wasmInput;
    this._wasmModules = await loadWasmModules(wasmInput);
  }

  run(): void {
    console.log(`Worker ${this._config.workerIdx} running!`);

    try {
      this._wasmModules.engineWorker.run();
    } catch (e) {
      console.log(e);
      // TODO post msg ?
    }
  }
}

let worker: EngineWorker;

const commands = {
  async init(config: WorkerConfig): Promise<void> {
    worker = new EngineWorker();
    const initData = await worker.init(config);
    postMessage(initData);
  },
  async initWasm(config: WorkerWasmMemConfig): Promise<void> {
    assert(worker);
    await worker.initWasm(config);
    postMessage('ready');
  },
  run(): void {
    worker.run();
  },
};

// ENTRY POINT
self.addEventListener('message', async ({ data: { command, params } }) => {
  if (commands.hasOwnProperty(command)) {
    try {
      commands[command as keyof typeof commands](params);
    } catch (err) {}
  }
});

export { EngineWorker, WorkerConfig, WorkerWasmMemConfig, WorkerInitData };
