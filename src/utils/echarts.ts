import { LineChart, PieChart } from "echarts/charts";
import {
   GraphicComponent,
   GridComponent,
   LegendComponent,
   TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
   CanvasRenderer,
   LineChart,
   PieChart,
   GridComponent,
   TooltipComponent,
   LegendComponent,
   GraphicComponent,
]);
