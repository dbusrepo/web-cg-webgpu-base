import assert from 'assert';
import { ViewPanelConfig } from '../config/config';
import { Panel } from './panel';
import { EnginePanel } from './enginePanel';
import { Console, ConsoleHandlersObjInit } from '../ui/console/console';

class ViewPanel extends Panel {

  constructor(board: HTMLDivElement, parentNode: HTMLDivElement) {
    super(board, parentNode);
  }

  init(config: ViewPanelConfig) {
    super.init(config);
    return this;
  }

  get config(): ViewPanelConfig {
    return super.config as ViewPanelConfig;
  }

  protected initKeyHandlers(): void {
    super.initKeyHandlers();
  }

  protected onConsoleOpening(): void {
    super.onConsoleOpening();
  }

  protected onConsoleClosing(): void {
    super.onConsoleClosing();
  }

  protected onConsoleHidden(): void {
    super.onConsoleHidden();
  }

  protected buildConsoleHandlers(): ConsoleHandlersObjInit {
    const consoleHandlers = super.buildConsoleHandlers();
    return { ...consoleHandlers }; // TODO augment ?
  }

  // async setFullScreen(enable: boolean): Promise<void> {
  //   await super.setFullScreen(enable);
  // }

  protected setFullStyle(): void {
    super.setFullStyle();
  }

  protected setWinStyle(): void {
    super.setWinStyle();
  }

  run() {
    super.run();
  }

  protected destroy() { // TODO
    super.destroy();
  }
}

export { ViewPanel };
