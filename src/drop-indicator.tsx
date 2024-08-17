import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import type { JSX } from 'solid-js';

type Orientation = 'horizontal' | 'vertical';

const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: 'horizontal',
  bottom: 'horizontal',
  left: 'vertical',
  right: 'vertical',
};

const orientationStyles: Record<Orientation, JSX.HTMLAttributes<HTMLElement>['class']> = {
  horizontal:
    'tw-h-[--line-thickness] tw-left-[--terminal-size] tw-right-0 before:tw-left-[--negative-terminal-size]',
  vertical:
    'tw-w-[--line-thickness] tw-top-[--terminal-size] tw-bottom-0 before:tw-top-[--negative-terminal-size]',
};

const edgeStyles: Record<Edge, JSX.HTMLAttributes<HTMLElement>['class']> = {
  top: 'tw-top-[--line-offset] before:tw-top-[--offset-terminal]',
  right: 'tw-right-[--line-offset] before:tw-right-[--offset-terminal]',
  bottom: 'tw-bottom-[--line-offset] before:tw-bottom-[--offset-terminal]',
  left: 'tw-left-[--line-offset] before:tw-left-[--offset-terminal]',
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

/**
 * This is a tailwind port of `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`
 */
export function DropIndicator(props: { edge: Edge; gap: string }) {
  return (
    <div
      style={
        {
          '--line-thickness': `${strokeSize}px`,
          '--line-offset': `calc(-0.5 * (${props.gap} + ${strokeSize}px))`,
          '--terminal-size': `${terminalSize}px`,
          '--terminal-radius': `${terminalSize / 2}px`,
          '--negative-terminal-size': `-${terminalSize}px`,
          '--offset-terminal': `${offsetToAlignTerminalWithLine}px`,
        } as JSX.CSSProperties
      }
      class={`tw-absolute tw-z-10 tw-bg-blue-700 tw-pointer-events-none before:tw-content-[''] before:tw-w-[--terminal-size] before:tw-h-[--terminal-size] tw-box-border before:tw-absolute before:tw-border-[length:--line-thickness] before:tw-border-solid before:tw-border-blue-700 before:tw-rounded-full ${orientationStyles[edgeToOrientationMap[props.edge]]} ${[edgeStyles[props.edge]]}`}
    />
  );
}
