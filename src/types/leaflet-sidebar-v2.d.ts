import type * as L from "leaflet";

/** Options accepted by the leaflet-sidebar-v2 control. */
export interface SidebarOptions {
   container: string;
   position?: "left" | "right" | "top" | "bottom";
   autopan?: boolean;
   closeButton?: boolean;
}

/** The sidebar control as exposed on `L.control.sidebar(...)`. */
export interface SidebarControl extends L.Control {
   open: (id: string) => this;
   close: () => this;
   on: (event: string, handler: (e: { id?: string }) => void) => this;
}

declare module "leaflet" {
   namespace control {
      function sidebar(options: SidebarOptions): SidebarControl;
   }
}

declare module "leaflet-sidebar-v2" {
   const sidebar: typeof L.control.sidebar;
   export default sidebar;
}
