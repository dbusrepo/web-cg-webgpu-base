// import assert from 'assert';
import { Pane as TweakPane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import GUI from '../ui/guify/src/gui';
import { Panel } from './panel';
import { PanelMenuConfig } from '../config/mainConfig';

type PanelTweakOptions = {
  level: number;
  name: string;
  active: boolean;
  // [k: string]: any;
};

// top panel with guify
// control pane with tweakpane
class PanelGui {
  private _config: PanelMenuConfig;
  private _panel: Panel;
  protected _topBar: GUI;
  protected _tweakPane: TweakPane;
  protected _tweakPaneOptions: PanelTweakOptions;

  init(panel: Panel, menuConfig: PanelMenuConfig): void {
    this._panel = panel;
    this._config = menuConfig;

    this.initTweakPane(panel, menuConfig);

    this._topBar = new GUI({
      root: panel.menuGuiContainer,
      // root: panel.panelEl,
      title: panel.title,
      theme: 'dark', // dark, light, yorha, or theme object
      align: 'right', // left, right
      width: 250,
      barMode: panel.menuGuiBarMode, // none, overlay, above, offset, full
      // panelMode: 'inner',
      opacity: 1.0, // 0.95,
      open: false,
      toggleFullScreen: () => {
        this._panel.toggleFullscreen();
      },
      toggleFullWin: () => {
        this._panel.toggleFullWin();
      },
      toggleControls: () => {
        this._tweakPane.expanded = !this._tweakPane.expanded;
        menuConfig.controlsPaneOpen = this._tweakPane.expanded;
        this._panel.focus();
      },
    }); // as unknown as typeof Guify;
  }

  initTweakPane(panel: Panel, menuConfig: PanelMenuConfig): void {
    const container = panel.canvasContainerEl;
    this._tweakPane = new TweakPane({
      container,
      expanded: menuConfig.controlsPaneOpen,
    });
    this._tweakPane.registerPlugin(EssentialsPlugin);
    this._initTweakPaneStyle(container);
    this._initTweakPaneOptions();
  }

  _initTweakPaneStyle(container: HTMLDivElement) {
    this._tweakPane.element.style.position = 'absolute';
    this._tweakPane.element.style.borderRadius = '0px';
    this._tweakPane.element.style.top = '0px';
    this._tweakPane.element.style.right = '0px';
    this._tweakPane.element.style.overflow = 'scroll';
    this._tweakPane.element.style.zIndex = '999999';
    // tweakPane.controller_.view.buttonElement.disabled = true;
    // tweakPane.controller_.view.buttonElement.style.display = 'none';

    // to make overflow scroll work
    if (this._tweakPane.element.clientHeight > container.clientHeight) {
      this._tweakPane.element.style.height = container.clientHeight + 'px';
    }
  }

  // private getDom(): HTMLElement {
  //   return this._gui.domElement;
  // }

  // private initPanel(): void {
  //   if (this._panel.panel !== this.getDom().parentNode) {
  //     this._panel.panel.appendChild(this.getDom());
  //   }
  //   this.setOnTop();
  // }

  // private setOnTop(): void {
  //   const parent = this._panel.canvasContainer;
  //   this.gui.domElement.style.zIndex = String(Number(parent.style.zIndex) + 1);
  // }

  // private removeMenuFromPanel(): void {
  //   this._panel.panel.removeChild(this.getDom());
  // }

  protected _initTweakPaneOptions() {
    if (!this._tweakPaneOptions) {
      this._tweakPaneOptions = {
        level: 0,
        name: 'Sketch',
        active: true,
      };
    }
    this._tweakPane.addInput(this._tweakPaneOptions, 'level');
    this._tweakPane.addInput(this._tweakPaneOptions, 'name');
    this._tweakPane.addInput(this._tweakPaneOptions, 'active');
    // this.addPanelOptions();
    // this.initConsoleOptions();
    // this.addEventLogFolderOptions();
    // if (!this._panel.isFullScreen) {
    //   this.addOptFullWin();
    // }
    // this.addFullscreenOption();
  }

  // protected addPanelOptions() {
  //   // TODO set params from config
  //   const PARAMS = {
  //     level: 0,
  //     name: 'Sketch',
  //     active: true,
  //   };
  //   this._tweakPane.addInput(PARAMS, 'level');
  //   this._tweakPane.addInput(PARAMS, 'name');
  //   this._tweakPane.addInput(PARAMS, 'active');
  // }

  // private initConsoleOptions(): void {
  //   if (!this._panel.console) {
  //     return;
  //   }

  //   const consoleFolder = this._gui.addFolder(
  //     this._config.MENU_OPTIONS.CONSOLE,
  //   );

  //   const consoleOptionValues = {
  //     // event controllers default values here
  //     [this._config.CONSOLE_OPTIONS.FONT_SIZE]: this._config.DEFAULT_FONT_SIZE,
  //     [this._config.CONSOLE_OPTIONS.LINE_HEIGHT]:
  //       this._config.DEFAULT_LINE_HEIGHT,
  //   };

  //   const fontSizeController = consoleFolder.add(
  //     consoleOptionValues,
  //     this._config.CONSOLE_OPTIONS.FONT_SIZE,
  //     this._config.MIN_FONT_SIZE,
  //     this._config.MAX_FONT_SIZE,
  //     this._config.FONT_SIZE_STEP,
  //   );

  //   fontSizeController.onChange((fontSize: number) => {
  //     this._panel.setConsoleFontSize(fontSize);
  //   });

  //   const lineHeightController = consoleFolder.add(
  //     consoleOptionValues,
  //     this._config.CONSOLE_OPTIONS.LINE_HEIGHT,
  //     this._config.MIN_LINE_HEIGHT,
  //     this._config.MAX_LINE_HEIGHT,
  //     this._config.LINE_HEIGHT_STEP,
  //   );

  //   lineHeightController.onChange((lineHeight: number) => {
  //     this._panel.setConsoleLineHeight(lineHeight);
  //   });

  //   consoleFolder.close();
  // }

  // private addEventLogFolderOptions(): void {
  //   if (!this._panel.eventLog) {
  //     return;
  //   }

  //   const eventsFolder = this._gui.addFolder(this._config.MENU_OPTIONS.EVENTS);

  //   const eventLogStartModeValue = this._panel.isEventLogBelowCanvas
  //     ? this._config.EVENT_LOG_POSITION_VALUES.BOTTOM
  //     : this._config.EVENT_LOG_POSITION_VALUES.PANEL;

  //   const _isEventLogVisible = this._panel.isEventLogVisible;

  //   const eventOptionValues = {
  //     // event controllers default values here
  //     [this._config.EVENT_LOG_OPTIONS.POSITION]: eventLogStartModeValue,
  //     [this._config.EVENT_LOG_OPTIONS.FONT_SIZE]:
  //       this._config.DEFAULT_FONT_SIZE,
  //     [this._config.EVENT_LOG_OPTIONS.LINE_HEIGHT]:
  //       this._config.DEFAULT_LINE_HEIGHT,
  //     [this._config.EVENT_LOG_OPTIONS.VISIBLE]: _isEventLogVisible,
  //   };

  //   const logPositions = [
  //     this._config.EVENT_LOG_POSITION_VALUES.BOTTOM,
  //     this._config.EVENT_LOG_POSITION_VALUES.PANEL,
  //   ];

  //   const eventLogVisController = eventsFolder.add(
  //     eventOptionValues,
  //     this._config.EVENT_LOG_OPTIONS.VISIBLE,
  //   );

  //   eventLogVisController.onChange((value: boolean) => {
  //     this._panel.setEventLogVisibility(value);
  //   });

  //   eventsFolder
  //     .add(
  //       eventOptionValues,
  //       this._config.EVENT_LOG_OPTIONS.POSITION,
  //       logPositions,
  //     )
  //     .onChange((position) => {
  //       switch (position) {
  //         case this._config.EVENT_LOG_POSITION_VALUES.BOTTOM:
  //           if (!this._panel.isEventLogBelowCanvas) {
  //             this._panel.setEventLogBelowCanvas();
  //           }
  //           break;
  //         case this._config.EVENT_LOG_POSITION_VALUES.PANEL:
  //           if (this._panel.isEventLogBelowCanvas) {
  //             this._panel.setEventLogOnCanvas();
  //           }
  //           break;
  //         default:
  //           break;
  //       }
  //     });

  //   const fontSizeController = eventsFolder.add(
  //     eventOptionValues,
  //     this._config.EVENT_LOG_OPTIONS.FONT_SIZE,
  //     this._config.MIN_FONT_SIZE,
  //     this._config.MAX_FONT_SIZE,
  //     this._config.FONT_SIZE_STEP,
  //   );

  //   fontSizeController.onChange((fontSize: number) => {
  //     this._panel.setEventLogFontSize(fontSize);
  //   });

  //   const lineHeightController = eventsFolder.add(
  //     eventOptionValues,
  //     this._config.EVENT_LOG_OPTIONS.LINE_HEIGHT,
  //     this._config.MIN_LINE_HEIGHT,
  //     this._config.MAX_LINE_HEIGHT,
  //     this._config.LINE_HEIGHT_STEP,
  //   );

  //   lineHeightController.onChange((lineHeight: number) => {
  //     this._panel.setEventLogLineHeight(lineHeight);
  //   });

  //   // TODO needed ?
  //   // this._menuOptions[this._config.MENU_OPTIONS.EVENTS] = eventOptionValues;

  //   eventsFolder.close();
  // }

  // private addOptFullWin(): void {
  //   const option = this._config.MENU_OPTIONS.FULLWIN;
  //   this._menuOptions[option] = this._panel.isFullWin;
  //   this._gui
  //     .add(this._menuOptions, option)
  //     .name(option)
  //     .onChange((value: boolean) => {
  //       this._panel.setFullWin(value);
  //     });
  // }

  // TODO remove
  // private addFullscreenOption(): void {
  //   const option = this._config.MENU_OPTIONS.FULLSCREEN;
  //   this._menuOptions[option] = this._panel.isFullScreen;
  //   this._gui
  //     .add(this._menuOptions, option)
  //     .name(option)
  //     .onChange((value: boolean) => {
  //       this._panel.setFullScreen(value);
  //     });
  // }

  // show() {
  //   // this._gui.show();
  // }

  // hide() {
  //   // this._gui.hide();
  // }

  // destroy() {
  //   // this._gui.close();
  //   // this.removeMenuFromPanel();
  //   // this._gui.destroy();
  // }

  protected get config(): PanelMenuConfig {
    return this._config;
  }

  protected get menuOptions(): PanelTweakOptions {
    return this._tweakPaneOptions;
  }

  protected get panel(): Panel {
    return this._panel;
  }

  removefromDom() {
    this._topBar.removefromDom();
    this._tweakPane.dispose();
  }
}

export { PanelGui, PanelTweakOptions };
