import type * as L from "leaflet";

/** Options accepted by the Leaflet.MiniMap control. */
export interface MiniMapOptions {
   toggleDisplay?: boolean;
   minimized?: boolean;
   position?: L.ControlPosition;
   width?: number;
   height?: number;
   strings?: {
      hideText?: string;
      showText?: string;
   };
}

declare module "leaflet" {
   namespace Control {
      class MiniMap extends Control {
         constructor(layer: L.Layer, options?: MiniMapOptions);
         changeLayer(layer: L.Layer): void;
      }
   }
}
