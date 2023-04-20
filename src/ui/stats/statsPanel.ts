import assert from 'assert';

const PR = Math.round(window.devicePixelRatio || 1); // #pixels per col

// const CSS_WIDTH = 80 * 5;
// const CSS_HEIGHT = 48 * 5;
const CSS_WIDTH = 80 * 1.3;
const CSS_HEIGHT = 48 * 1.3;

const WIDTH = 80 * PR;
const HEIGHT = 48 * PR;
const CSS_GRAPH_WIDTH = 74;
// const CSS_GRAPH_WIDTH = 15; // for test
const CSS_GRAPH_HEIGHT = 30;

const TEXT_X = 3 * PR;
const TEXT_Y = 2 * PR;
const GRAPH_X = 3 * PR;
const GRAPH_Y = 15 * PR;
const GRAPH_WIDTH = CSS_GRAPH_WIDTH * PR;
const GRAPH_HEIGHT = CSS_GRAPH_HEIGHT * PR;

const BG_ALPHA = 0.9;

type StatsPanelConfig = {
  title: string; 
  fg: string;
  bg: string;
  graphHeight: number;
};

class StatsPanel {
  private cfg: StatsPanelConfig;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private title: string;
  private fgCol: string;
  private bgCol: string;
  private values: number[]; // as a circular array store last N values
  private nextIdx: number; // next value index
  private min = Infinity;
  private max = 0;
  private heightScaleFactor: number;
  // private heightRescaleThreshold: number;
  private curIdx: number; // cur update index, inc at every update
  private maxDeque: number[]; // deque values to impl max of last N values
  private maxDequeIdx: number[]; // deque indices

  constructor(cfg: StatsPanelConfig) {
    this.cfg = cfg;
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.width = `${CSS_WIDTH}px`;
    this.canvas.style.height = `${CSS_HEIGHT}px`;
    this.title = this.cfg.title;
    this.fgCol = this.cfg.fg;
    this.bgCol = this.cfg.bg;

    const context = this.canvas.getContext('2d');
    assert(context);
    this.context = context;
    this.context.font = 'bold ' + 9 * PR + 'px Helvetica,Arial,sans-serif';
    this.context.textBaseline = 'top';

    // draw the entire canvas background
    this.context.fillStyle = this.cfg.bg;
    this.context.fillRect(0, 0, WIDTH, HEIGHT);

    // draw the title
    this.context.fillStyle = this.cfg.fg;
    this.context.fillText(this.cfg.title, TEXT_X, TEXT_Y);

    // draw the graph area
    this.drawGraphBackground();

    // alloc mem for panel values and the threshold for scaling heights
    this.values = new Array(CSS_GRAPH_WIDTH).fill(0);
    // normalization factor to scale value to col heights in pixels
    this.heightScaleFactor = this.cfg.graphHeight;
    // this.heightRescaleThreshold = 0;
    this.nextIdx = 0;
    this.curIdx = 0;
    this.maxDeque = [];
    this.maxDequeIdx = [];
  }

  get Title(): string {
    return this.title;
  }

  get dom(): HTMLCanvasElement {
    return this.canvas;
  }

  private drawGraphBackground(): void {
    this.context.fillStyle = this.fgCol;
    this.context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

    this.context.fillStyle = this.bgCol;
    this.context.globalAlpha = BG_ALPHA;
    this.context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);
  }

  // private downScaleBound(): number {
  //   return ((this.heightRescaleThreshold / 3) * 2) / 3;
  // }

  // private checkDownRescale(): boolean {
  //   // downscale if max value is less than 2/3 of the first third of the graph height
  //   const res = this._maxDeque[0] < this.downScaleBound();
  //   // return res;
  //   return false;
  // }

  // bound max value to 2/3 of the graph height, so up rescale when a new value
  // is greater than 2/3 of the graph height
  // down rescale when max value is less than 2/3 of the first third of the graph height
  // and map the 2/3 of the first third of the graph height to 2/3 of the graph height
  // private recalcRedrawThreshold(source: number): void {
  //   // const factor = (source / CSS_GRAPH_HEIGHT) | 0;
  //   // const RESCALE_FACTOR = 2;
  //   // this._redrawThreshold = CSS_GRAPH_HEIGHT * (factor + RESCALE_FACTOR);
  //   console.log(source);
  //   this._heightScaleFactor = source * 3; // bound scaled values to 2/3 of the graph height
  //   this.heightRescaleThreshold = (this._heightScaleFactor * 3);
  //   assert(this._heightScaleFactor >= source);
  //   console.log(this._heightScaleFactor, this.heightRescaleThreshold);
  // }

  update(value = 0) {
    value = Math.max(value, 0);

    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);

    // draw the text background
    this.context.fillStyle = this.bgCol;
    this.context.globalAlpha = 1;
    this.context.fillRect(0, 0, WIDTH, GRAPH_Y);

    // draw the text
    const text = Math.round(value) + ' ' + this.title;
    // + ' ('
    // + // Math.round(this._min)
    // + // '-'
    // + Math.round(this._max)
    // + ')';

    this.context.fillStyle = this.fgCol;
    this.context.fillText(
      text,
      TEXT_X,
      TEXT_Y,
      // GRAPH_WIDTH
    );

    // rescaling disabled
    // this.updateMaxDeque(value);
    // let downScale = false;
    // if (
    //   value > this.heightRescaleThreshold ||
    //   (downScale = this.checkDownRescale())
    // ) {
    //   console.log('rescaling');
    //   do {
    //     const source = downScale ? this.downScaleBound() : value;
    //     this.recalcRedrawThreshold(source);
    //   } while (downScale && (downScale = this.checkDownRescale()));
    //
    //   this.drawGraphBackground();
    //
    //   // redraw scaled values
    //   this._context.fillStyle = this._fgCol;
    //   this._context.globalAlpha = 1;
    //   for (let i = 0, { length } = this._values; i < length; ++i) {
    //     const idx = i + this._nextIdx;
    //     const cur = idx < length ? idx : idx - length;
    //     const curVal = this._values[cur];
    //     const h = Math.round((curVal / this._heightScaleFactor) * GRAPH_HEIGHT);
    //     this._context.fillRect(
    //       GRAPH_X + PR * i,
    //       GRAPH_Y + GRAPH_HEIGHT - h,
    //       PR,
    //       h,
    //     );
    //   }
    // }

    this.values[this.nextIdx++] = value;
    this.nextIdx %= this.values.length;

    // draw the current graph shifted left one col (PR)
    this.context.globalAlpha = 1;
    this.context.drawImage(
      this.canvas,
      GRAPH_X + PR,
      GRAPH_Y,
      GRAPH_WIDTH - PR,
      GRAPH_HEIGHT,
      GRAPH_X,
      GRAPH_Y,
      GRAPH_WIDTH - PR,
      GRAPH_HEIGHT,
    );

    /* DRAW THE LAST COL (value): two steps: full col with fg col + upper part with bg col */

    // draw the last (new) col: first draw the entire col with the fg background
    this.context.fillStyle = this.fgCol;
    this.context.globalAlpha = 1;
    this.context.fillRect(
      GRAPH_X + GRAPH_WIDTH - PR,
      GRAPH_Y,
      PR,
      GRAPH_HEIGHT,
    );

    // then draw the upper part with the bg color
    const hUpper = Math.round(
      (1 - value / this.heightScaleFactor) * GRAPH_HEIGHT,
    );
    // console.log('Last col: ' + (1 - value / this._redrawThreshold));
    this.context.fillStyle = this.bgCol;
    this.context.globalAlpha = BG_ALPHA;
    this.context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, hUpper);

    this.curIdx++;
  }

  private updateMaxDeque(value: number): void {
    const deque = this.maxDeque;
    const dequeIdx = this.maxDequeIdx;
    while (dequeIdx.length && dequeIdx[0] < this.curIdx - CSS_GRAPH_WIDTH) {
      deque.shift();
      dequeIdx.shift();
    }
    while (deque.length && deque[deque.length - 1] <= value) {
      deque.pop();
      dequeIdx.pop();
    }
    deque.push(value);
    dequeIdx.push(this.curIdx);
  }
}

export { StatsPanel };
