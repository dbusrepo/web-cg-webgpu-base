import type { Key } from './keys';
import { PanelId } from '../app/appTypes';

type InputEvent = {
  code: Key;
  panelId: PanelId;
}

type CanvasDisplayResizeEvent = {
  width: number;
  height: number;
};

export type { InputEvent, CanvasDisplayResizeEvent };
