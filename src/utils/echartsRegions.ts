import { MapChart } from "echarts/charts";
import { GeoComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

// ECharts modules for the `/regions` map. `use()` only runs when a page that
// imports this module is loaded, so the stats pages never register the map
// chart and the region map never registers the line and pie charts. The
// bundler still groups all echarts code into one shared `vendor-charts` chunk
// (see `manualChunks` in `vite.config.ts`).
use([CanvasRenderer, MapChart, GeoComponent, TooltipComponent, VisualMapComponent]);
