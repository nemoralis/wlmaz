import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, PieChart } from "echarts/charts";
import {
   GridComponent,
   TooltipComponent,
   LegendComponent,
   GraphicComponent,
} from "echarts/components";

use([
   CanvasRenderer,
   LineChart,
   PieChart,
   GridComponent,
   TooltipComponent,
   LegendComponent,
   GraphicComponent,
]);
