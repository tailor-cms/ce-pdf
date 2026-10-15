import type { PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import { TouchManager } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Pinch and Ctrl + wheel zoom, anchored at the pointer. The pdf.js viewer
// component leaves these to its full viewer app, so without them the browser
// zooms the whole page instead of the document.

// Redraw pages at full quality only once the gesture pauses
const DRAWING_DELAY = 400;
// Wheel deltas above this (px) come from a mouse wheel, not a trackpad pinch
const WHEEL_NOTCH_THRESHOLD = 50;

type Point = [x: number, y: number];

// Safari's non-standard trackpad pinch event
interface GestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

export const bindZoomGestures = (
  container: HTMLElement,
  viewer: PDFViewer,
  signal: AbortSignal,
) => {
  // pdf.js rounds the scale to 2 decimals, so tiny per-event factors from
  // smooth gestures are accumulated until they change the scale
  let pendingFactor = 1;

  // pdf.js expects the origin relative to the container's offset parent
  // (it subtracts `offsetTop`/`offsetLeft`), which only matches client
  // coordinates in its full-page viewer app
  const toOrigin = ([x, y]: Point): Point => {
    const { left, top } = container.getBoundingClientRect();
    return [x - left + container.offsetLeft, y - top + container.offsetTop];
  };

  const zoom = (factor: number, point: Point) => {
    pendingFactor *= factor;
    const current = viewer.currentScale;
    if (Math.round(current * pendingFactor * 100) / 100 === current) return;
    viewer.updateScale({
      scaleFactor: pendingFactor,
      origin: toOrigin(point),
      drawingDelay: DRAWING_DELAY,
    });
    pendingFactor = 1;
  };

  // Safari reports trackpad pinch as gesture events; ignore any Ctrl + wheel
  // it may also send meanwhile so the zoom isn't applied twice
  let isGesture = false;
  let gestureScale = 1;

  // Trackpad pinch (Chrome, Edge, Firefox) and Ctrl + mouse wheel
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (isGesture) return;
    const point: Point = [e.clientX, e.clientY];
    const isNotch =
      e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
      Math.abs(e.deltaY) >= WHEEL_NOTCH_THRESHOLD;
    if (!isNotch) return zoom(Math.exp(-e.deltaY / 100), point);
    // Mouse wheel notches zoom in the same steps as the toolbar buttons
    viewer.updateScale({
      steps: -Math.sign(e.deltaY),
      origin: toOrigin(point),
      drawingDelay: DRAWING_DELAY,
    });
  };

  const onGestureStart = (e: Event) => {
    e.preventDefault();
    isGesture = true;
    gestureScale = 1;
  };

  const onGestureChange = (e: Event) => {
    e.preventDefault();
    const { scale, clientX, clientY } = e as GestureEvent;
    zoom(scale / gestureScale, [clientX, clientY]);
    gestureScale = scale;
  };

  const onGestureEnd = (e: Event) => {
    e.preventDefault();
    isGesture = false;
  };

  const active = { passive: false, signal };
  container.addEventListener('wheel', onWheel, active);
  container.addEventListener('gesturestart', onGestureStart, active);
  container.addEventListener('gesturechange', onGestureChange, active);
  container.addEventListener('gestureend', onGestureEnd, active);

  // Two-finger pinch on touch screens, using the pdf.js viewer app's handler.
  // It takes over two-finger moves, so panning with them scrolls here.
  // eslint-disable-next-line no-new
  new TouchManager({
    container,
    signal,
    onPinching: (origin: Point, prevDistance: number, distance: number) =>
      zoom(distance / prevDistance, origin),
    onPanning: (dx: number, dy: number) => container.scrollBy(-dx, -dy),
  });
};
