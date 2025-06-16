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
    'tw:h-(--line-thickness) tw:left-(--terminal-size) tw:right-0 tw:before:left-(--negative-terminal-size)',
  vertical:
    'tw:w-(--line-thickness) tw:top-(--terminal-size) tw:bottom-0 tw:before:top-(--negative-terminal-size)',
};

const edgeStyles: Record<Edge, JSX.HTMLAttributes<HTMLElement>['class']> = {
  top: 'tw:top-(--line-offset) tw:before:top-(--offset-terminal)',
  right: 'tw:right-(--line-offset) tw:before:right-(--offset-terminal)',
  bottom: 'tw:bottom-(--line-offset) tw:before:bottom-(--offset-terminal)',
  left: 'tw:left-(--line-offset) tw:before:left-(--offset-terminal)',
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
      class={`tw:absolute tw:z-10 tw:bg-blue-700 tw:pointer-events-none tw:before:content-[''] tw:before:w-(--terminal-size) tw:before:h-(--terminal-size) tw:box-border tw:before:absolute tw:before:border-(length:--line-thickness) tw:before:border-solid before:tw:border-blue-700 tw:before:rounded-full ${orientationStyles[edgeToOrientationMap[props.edge]]} ${[edgeStyles[props.edge]]}`}
    />
  );
}
