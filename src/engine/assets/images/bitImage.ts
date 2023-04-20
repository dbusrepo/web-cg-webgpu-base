abstract class BitImage {
  protected width: number;
  protected height: number;
  protected pixels: Uint8Array;

  // constructor() {}

  // call it before insert data
  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.allocPixels();
  }

  protected abstract allocPixels(): void;

  get Width() {
    return this.width;
  }

  get Height() {
    return this.height;
  }

  get Pixels() {
    return this.pixels;
  }
}

export { BitImage };
