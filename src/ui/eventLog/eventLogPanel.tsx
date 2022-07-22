import assert from 'assert';
import { h, JSX } from 'preact';
import React, { useState, useEffect } from 'react';
import { EventLogHistoryPanel, EventLogEntry } from './eventLogHistoryPanel';

type EventLogPanelProps = {
  parentContainer: HTMLDivElement;
  history: EventLogEntry[];
  scrollToBottom: boolean; // force show the bottom of the panel, used when switching own vs main panel
  lineHeight: number;
  fontSize: number;
  updateRender: (props: EventLogPanelProps) => void;
  prompt: string,
};

const EventLogPanel = (props: EventLogPanelProps): JSX.Element => {
  const { history, parentContainer, scrollToBottom, fontSize, lineHeight, updateRender, prompt } = props;
  const [autoScrollNewItems, setAutoScrollNewItems] = useState(true);
  const [forceScrollTo, setForceScrollTo] = useState(null as number | null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [grabPos, setGrabPos] = useState({ top: 0, y: 0 });
  const [input, setInput] = useState(prompt);
  let listContRef: HTMLElement;
  let inputRef: HTMLInputElement;

  const onWheel = (e: WheelEvent) => {
    // if the user is scrolling up with the mouse wheel disable auto scroll to the last item
    if (e.deltaY < 0) {
      setAutoScrollNewItems(false);
    }
  };

  const isElBottomVisible = (el: HTMLElement) => {
    return el.scrollTop >= el.scrollHeight - el.clientHeight;
  };

  const onScroll = (e: React.ChangeEvent<HTMLDivElement>) => {
    if (scrollToBottom) { // we are scrolling, reset scrollToBottom
      setForceScrollTo(null);
      updateRender({ ...props, scrollToBottom: false });
    }
    if (e && e.target) {
      const el = e.target as HTMLDivElement;
      // const bottom = (el.scrollHeight - el.scrollTop) === el.clientHeight;
      // if the bottom is visible re-enable the auto scroll to the last event item
      if (isElBottomVisible(el)) {
        setAutoScrollNewItems(true);
      }
    }
  };

  // console.log('isGrabbing: ' + isGrabbing);
  // console.log('grab pos ' + grabPos);
  // console.log('forceScrollTo: ' + forceScrollTo);
  // console.log('autoscroll: ' + autoScrollNewItems);

  useEffect(() => {
    const el = listContRef;

    const mouseDownHandler = function(e: MouseEvent) {
      // console.log('mouseDownHandler');

      // Change the cursor and prevent user from selecting the text
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';

      setGrabPos({
        // The current scroll
        top: el.scrollTop,
        // Get the current mouse position
        y: e.clientY,
      });

      setIsGrabbing(true);
      // setForceScrollTo(0);

      // el.addEventListener('mousemove', mouseMoveHandler);
      // el.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function (e: MouseEvent) {
      // console.log('mouseMoveHandler');
      // const dy = e.clientY - pos.y;
      setGrabPos((pos) => ({
        // The current scroll
        top: pos.top - (e.clientY - pos.y),
        // Get the current mouse position
        y: e.clientY,
      }));
      // setForceScrollTo(pos.top - dy);
      // setForceScrollTo(0);
    };

    const mouseUpHandler = function () {
      // console.log('mouseUpHandler');
      el.removeEventListener('mousemove', mouseMoveHandler);
      el.removeEventListener('mouseup', mouseUpHandler);

      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');

      setIsGrabbing(false);
      setAutoScrollNewItems(isElBottomVisible(el));
      // setForceScrollTo(null);
    };

    // console.log('add listener');

    const releaseHandlers = () => {
      // console.log('remove handlers');
      el.removeEventListener('mousedown', mouseDownHandler);
      el.removeEventListener('mousemove', mouseMoveHandler);
      el.removeEventListener('mouseup', mouseUpHandler);
    };

    // console.log('effect');

    if (!isGrabbing) {
      if (scrollToBottom) {
        // fast scroll to last...
        setForceScrollTo((el.scrollHeight - el.clientHeight) as any);
        // set also auto scroll to new items...
        setAutoScrollNewItems(true);
      } else {
        setForceScrollTo(null);
      }
      el.addEventListener('mousedown', mouseDownHandler);
      // return () => el.removeEventListener('mousedown', mouseDownHandler);
    } else {
      el.addEventListener('mousemove', mouseMoveHandler);
      el.addEventListener('mouseup', mouseUpHandler);
      setForceScrollTo(grabPos.top);
      // return () => { 
      //   el.removeEventListener('mousemove', mouseMoveHandler);
      //   el.removeEventListener('mouseup', mouseUpHandler);
      // };
    }

    inputRef.value = input;

    return releaseHandlers;
  });


  const isCursorOnPrompt = (pos: number | null) => {
    return pos === 0 || (pos && pos <= prompt.length);
  };

  let ctrlDown = false; // TODO ok?

  const onInputKeyDown = (event: KeyboardEvent) => {
    // see note here about the use of preventDefault in onKeydown
    // vs onKeyChange with a react input element
    // stackoverflow.com/q/57807522 // TODO
    switch (event.key) {
      case 'Enter':
        event.preventDefault(); // TODO
        // const target = event.target as HTMLInputElement;
        // this.props.dispatch(this.inputRef.value); // TODO
        setInput(prompt);
        setAutoScrollNewItems(true);
        break;
      case 'ArrowUp':
        event.preventDefault();
        break;
      case 'ArrowDown':
        event.preventDefault();
        break;
      case 'ArrowLeft': // block cursor when moving left in the prompt prefix
        {
          const inputEl = event.target as HTMLInputElement;
          // inputEl.focus();
          const { selectionStart } = inputEl;
          if (isCursorOnPrompt(selectionStart)) {
            event.preventDefault();
          }
        }
        break;
      case 'Backspace': // avoid backspace when just after the prompt the user press bs
        {
          const inputEl = event.target as HTMLInputElement;
          const { selectionStart } = inputEl;
          if (isCursorOnPrompt(selectionStart)) {
            event.preventDefault();
          }
        }
        break;
      case 'Control':
        ctrlDown = true;
        break;
      case 'a': // C-a should go after the prompt prefix...
        if (ctrlDown) {
          event.preventDefault();
          const inputEl = event.target as HTMLInputElement;
          inputEl.setSelectionRange(prompt.length, prompt.length);
        }
        break;
      case 'u': // C-u delete text before the cursor (prompt excluded)
        if (ctrlDown) {
          event.preventDefault();
          const inputEl = event.target as HTMLInputElement;
          const { selectionStart } = inputEl;
          inputEl.value =
            prompt +
            (selectionStart !== null
              ? inputEl.value.substring(selectionStart)
              : '');
          // force cursor position after the prompt
          inputEl.setSelectionRange(prompt.length, prompt.length);
        }
        break;
    }

  };

  const onInputKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = (event.target as HTMLInputElement).value;
    const line = prompt + input.substring(prompt.length);
    inputRef.value = line;
    setInput(line);
  };

  const onInputClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    // if the user clicks on prompt string reset cursor pos...
    event.preventDefault();
    const inputEl = event.target as HTMLInputElement;
    const { selectionStart: pos } = inputEl;
    if (pos === 0 || (pos && pos < prompt.length)) {
      const tpos = inputEl.value.length; // ...to the end of the input
      inputEl.setSelectionRange(tpos, tpos);
    }
  }

  const onInputKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Control':
        ctrlDown = false;
        break;
    }
  };

  const lineHeightStyle = `${lineHeight}px`;
  const fontSizeStyle = `${fontSize}px`;

  const labelStyle = buildLabelStyle(
    lineHeightStyle,
    fontSizeStyle,
  );

  const inputStyle = buildInputStyle(
    lineHeightStyle,
    fontSizeStyle,
  );

  const logListStyle = buildHistoryStyle(
    parentContainer,
    lineHeight,
  );

  return (
    <label className="event-log-label" style={labelStyle}>
      <div
        className="event-log-history"
        style={logListStyle}
        onScroll={onScroll}
        onWheel={onWheel}
        ref={(el) => (listContRef = el!)}
      >
        <EventLogHistoryPanel
          logs={history}
          getPanelRef={() => listContRef}
          scrollTopTo={forceScrollTo}
          autoScrollNewItems={autoScrollNewItems}
        />
      </div>
      <input
        className="event-log-input"
        style={inputStyle}
        onKeyDown={onInputKeyDown}
        onChange={onInputKeyChange}
        onKeyUp={onInputKeyUp}
        onClick={onInputClick}
        ref={(el) => {
          inputRef = el!;
        }}
        // onKeyDown={}
        // onKeyUp={this.onKeyUp.bind(this)}
        // onChange={this.onStmtInputChange.bind(this)}
      />
    </label>
  );
};

const LABEL_HEIGHT_PERC = 100; // event log panel height is 100% of parent container height
const INPUT_PADDING_TOP = 2;
const INPUT_PADDING_BOTTOM = 2;

const buildLabelStyle = (lineHeight: string, fontSize: string) => {

  const labelStyle = {
    height: `${LABEL_HEIGHT_PERC}%`,
    fontSize,
    lineHeight,
  };

  return labelStyle;
};

const buildHistoryStyle = (parentContainer: HTMLDivElement, lineHeight: number) => {

  const labelHeight = (LABEL_HEIGHT_PERC / 100) * parentContainer.clientHeight;

  // calc the height of the log list part inside the event panel (it is above the input el)
  const inputVertPadding = INPUT_PADDING_TOP + INPUT_PADDING_BOTTOM;
  const inputHeightToPanel = (lineHeight + inputVertPadding) / labelHeight;
  const histHeightPerc = 100 * (1 - inputHeightToPanel);
  // const listHeightStyle = `${Math.round(listHeight

  const historyStyle = {
    height: `${Math.round(histHeightPerc)}%`,
  };

  return historyStyle;
};

const buildInputStyle = (lineHeight: string, fontSize: string) => {

  const inputStyle = {
    fontSize,
    lineHeight,
    height: lineHeight, // use the same
    paddingTop: `${INPUT_PADDING_TOP}px`,
    paddingBottom: `${INPUT_PADDING_BOTTOM}px`,
  };

  return inputStyle;
};

export { EventLogPanel, EventLogPanelProps };
