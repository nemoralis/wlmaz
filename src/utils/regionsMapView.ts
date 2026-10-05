/**
 * Viewport maths for the zoomable SVG map on `/regions`.
 *
 * Zoom and pan are done by rewriting the `viewBox` attribute rather than by
 * transforming the DOM. That keeps the map resolution-independent, leaves the
 * existing `vector-effect="non-scaling-stroke"` borders crisp at every level,
 * and needs no dependency.
 *
 * The invariant this module exists to protect: **the viewBox aspect ratio never
 * changes**. A view is always `width / zoom` by `height / zoom`, so the box
 * keeps the full map's proportions. The `<svg>` element is laid out at that same
 * aspect (`w-full h-auto`), so `preserveAspectRatio="xMidYMid meet"` never
 * letterboxes and no blank margin appears while panning. It also means the
 * pixel-to-user-unit scale is a single number per zoom level, which is what
 * makes dragging a one-line conversion.
 *
 /**
 * Coordinates are the map's own user units: origin top-left, matching the
 * `viewBox` that `buildRegionsMap` writes into the payload.
 *
 * Every function here is total. Bad input — `NaN`, `Infinity`, zero, a negative
 * base, a missing base — resolves to a usable view rather than propagating into
 * an attribute like `viewBox="NaN NaN NaN NaN"`.
 */

/** The full map extent in user units. */
export interface MapBase {
   width: number;
   height: number;
}

/** What `mapBaseOf` needs; accepts the composable's readonly payload wrapper. */
type MapBaseSource = { readonly viewBox?: string | null } | null | undefined;

/** What the map currently shows: the top-left of the visible window, and the zoom. */
export interface MapView {
   x: number;
   y: number;
   zoom: number;
}

/** Edge to edge. Panning is impossible here, so this is also where a drag starts. */
export const MIN_MAP_ZOOM = 1;

/**
 * Deep enough to turn the smallest district into a comfortable tap target.
 * Xankəndi and Yasamal are 8-9 units across, which is 3px wide on a 350px phone
 * at 1x and roughly 95px at 32x.
 */
export const MAX_MAP_ZOOM = 32;

/** One press of the zoom-in button: 1 -> 2 -> 4 -> 8 -> 16 -> 32. */
export const ZOOM_STEP = 2;

/** Travel, in client px, past which a gesture stops counting as a click. */
export const DRAG_THRESHOLD_PX = 4;

/**
 * Wheel-delta to zoom multiplier.
 *
 * `ln(2) / 100` makes one 100-unit wheel notch — the classic single click on a
 * mouse wheel — double the zoom, matching `ZOOM_STEP`. Exponential rather than
 * linear so a trackpad's many small deltas zoom smoothly instead of stepping.
 * A trackpad pinch arrives as a wheel event with `ctrlKey` set, so it lands here
 * too and is captured rather than left to the browser's own page zoom.
 */
export const WHEEL_ZOOM_RATE = Math.LN2 / 100;

/** Used only when the payload's own extent is missing or unusable. */
const FALLBACK_BASE: MapBase = { width: 1000, height: 757 };

const finiteOr = (value: number | null | undefined, fallback: number): number =>
   typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeBase = (base?: Partial<MapBase> | null): MapBase => {
   const width = finiteOr(base?.width, FALLBACK_BASE.width);
   const height = finiteOr(base?.height, FALLBACK_BASE.height);
   return {
      width: width > 0 ? width : FALLBACK_BASE.width,
      height: height > 0 ? height : FALLBACK_BASE.height,
   };
};

/** Keeps zoom inside the supported range. Anything unusable becomes the minimum. */
export const clampZoom = (zoom: number): number =>
   Math.min(Math.max(finiteOr(zoom, MIN_MAP_ZOOM), MIN_MAP_ZOOM), MAX_MAP_ZOOM);

/** The whole map, edge to edge. What a fresh visit to `/regions` shows. */
export const initialMapView = (): MapView => ({ x: 0, y: 0, zoom: MIN_MAP_ZOOM });

/** True when the view is the untouched whole-country frame. */
export const isResetView = (view: MapView): boolean =>
   clampZoom(view?.zoom ?? NaN) === MIN_MAP_ZOOM && (view?.x ?? 0) === 0 && (view?.y ?? 0) === 0;

export const canZoomIn = (view: MapView): boolean => clampZoom(view?.zoom ?? NaN) < MAX_MAP_ZOOM;

export const canZoomOut = (view: MapView): boolean => clampZoom(view?.zoom ?? NaN) > MIN_MAP_ZOOM;

/**
 * Reads the map extent out of the payload's viewBox string.
 *
 * The generator always writes an origin of `0 0`, so only width and height are
 * carried across. An unparseable or absent viewBox falls back to the same
 * 1000x757 the generator produces for the real country, and `RegionsMap.vue`
 * still renders.
 */
export const mapBaseFromViewBox = (viewBox?: string | null): MapBase => {
   const parts = (viewBox ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
   if (parts.length < 4) return normalizeBase(null);
   return normalizeBase({ width: parts[2], height: parts[3] });
};

/** The visible window's size in user units. */
export const viewSize = (view: MapView, base?: Partial<MapBase> | null) => {
   const size = normalizeBase(base);
   const zoom = clampZoom(view?.zoom ?? NaN);
   return { width: size.width / zoom, height: size.height / zoom };
};

/**
 * Confines the visible window to the map.
 *
 * At 1x the window is the whole map, so the allowed offset collapses to zero on
 * both axes and there is nothing to pan — which is why pan cannot be started
 * until the visitor has zoomed in.
 */
export const clampView = (view: MapView, base?: Partial<MapBase> | null): MapView => {
   const size = normalizeBase(base);
   const zoom = clampZoom(view?.zoom ?? NaN);
   const window = { width: size.width / zoom, height: size.height / zoom };
   const maxX = Math.max(0, size.width - window.width);
   const maxY = Math.max(0, size.height - window.height);

   return {
      x: Math.min(Math.max(finiteOr(view?.x, 0), 0), maxX),
      y: Math.min(Math.max(finiteOr(view?.y, 0), 0), maxY),
      zoom,
   };
};

/**
 * Moves the window's top-left corner by `dx`/`dy` user units.
 *
 * `dx` positive slides the viewport right, so content appears to move left. The
 * component negates the drag delta before calling this, so the map follows the
 * finger.
 */
export const panBy = (
   view: MapView,
   dx: number,
   dy: number,
   base?: Partial<MapBase> | null,
): MapView =>
   clampView(
      {
         x: finiteOr(view?.x, 0) + finiteOr(dx, 0),
         y: finiteOr(view?.y, 0) + finiteOr(dy, 0),
         zoom: view?.zoom ?? MIN_MAP_ZOOM,
      },
      base,
   );

/**
 * Multiplies the zoom by `factor`, holding `anchor` at the same point on screen.
 *
 * Anchoring is what makes wheel and pinch feel right: the pixel under the cursor
 * or between the fingers stays under it. Button presses pass the window's
 * centre, so zooming stays centred.
 *
 * The result is clamped, which can pull the anchor slightly off its exact
 * position near an edge. That is deliberate — the alternative is refusing to
 * zoom at all.
 */
export const zoomAt = (
   view: MapView,
   factor: number,
   anchor: { x: number; y: number },
   base?: Partial<MapBase> | null,
): MapView => {
   const current = clampView(view, base);
   const size = normalizeBase(base);
   const ratio = finiteOr(factor, 1);
   const zoom = clampZoom(current.zoom * ratio);
   if (zoom === current.zoom) return current;

   const from = viewSize(current, size);
   const to = viewSize({ ...current, zoom }, size);

   // Where the anchor sits within the window, 0..1, before and after.
   const relX = (finiteOr(anchor?.x, 0) - current.x) / from.width;
   const relY = (finiteOr(anchor?.y, 0) - current.y) / from.height;

   return clampView(
      { x: anchor?.x - relX * to.width, y: anchor?.y - relY * to.height, zoom },
      size,
   );
};

/** The centre of the visible window, in user units. The anchor for button presses. */
export const windowCentre = (view: MapView, base?: Partial<MapBase> | null) => {
   const size = viewSize(view, base);
   return { x: (view?.x ?? 0) + size.width / 2, y: (view?.y ?? 0) + size.height / 2 };
};

/** Rounded to keep the attribute short without visibly shifting the map. */
const round = (value: number): number => Math.round(value * 100) / 100;

/** The `viewBox` attribute value for a view. Aspect is preserved at any zoom. */
export const viewBoxFor = (view: MapView, base?: Partial<MapBase> | null): string => {
   const current = clampView(view, base);
   const size = viewSize(current, base);
   return [round(current.x), round(current.y), round(size.width), round(size.height)].join(" ");
};

/** Convenience for the component: the base implied by a loaded payload. */
export const mapBaseOf = (payload: MapBaseSource): MapBase => mapBaseFromViewBox(payload?.viewBox);

const LINES_PER_NOTCH = 16;
const PAGES_PER_NOTCH = 100;

/**
 * Wheel delta in pixels.
 *
 * Firefox reports lines and some setups report pages; without this a single
 * notch would zoom by wildly different amounts across browsers.
 */
export const normalizeWheelDelta = (deltaY: number, deltaMode?: number): number => {
   const delta = finiteOr(deltaY, 0);
   if (deltaMode === 1) return delta * LINES_PER_NOTCH;
   if (deltaMode === 2) return delta * PAGES_PER_NOTCH;
   return delta;
};

/** Scroll down (positive delta) zooms out; scroll up zooms in. */
export const wheelZoomFactor = (deltaY: number, deltaMode?: number): number =>
   Math.exp(-normalizeWheelDelta(deltaY, deltaMode) * WHEEL_ZOOM_RATE);
