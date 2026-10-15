import { icon } from "@fortawesome/fontawesome-svg-core";
import L from "leaflet";
import "./basemap-control.css";

/** A selectable map background: display name plus its tile layer. */
export interface BaseMapEntry {
   name: string;
   layer: L.TileLayer;
}

/**
 * Basemap switcher control.
 *
 * Replaces Leaflet's stock layers control so the app owns the markup: the
 * toggle renders its own icon (nothing patches Leaflet's DOM from outside),
 * the panel uses native radios for keyboard and screen-reader support, and
 * switching basemaps fires the standard `baselayerchange` event — the
 * minimap sync listens for it.
 */
export class BasemapControl extends L.Control {
   private readonly entries: BaseMapEntry[];
   private current: L.TileLayer;
   private mapInstance: L.Map | null = null;
   private container: HTMLDivElement | null = null;
   private panel: HTMLDivElement | null = null;
   private toggle: HTMLButtonElement | null = null;
   private outsideClose: ((e: Event) => void) | null = null;

   constructor(entries: BaseMapEntry[]) {
      super({ position: "topright" });
      if (entries.length === 0) {
         throw new Error("BasemapControl requires at least one basemap entry");
      }
      this.entries = entries;
      this.current = entries[0].layer;
   }

   onAdd(map: L.Map): HTMLElement {
      this.mapInstance = map;
      // Whichever layer the map already shows is the current selection.
      this.current =
         this.entries.find((e) => map.hasLayer(e.layer))?.layer ?? this.entries[0].layer;

      const container = L.DomUtil.create("div", "wlm-basemap-control") as HTMLDivElement;
      this.container = container;

      // Toggle button
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "wlm-basemap-toggle";
      toggle.setAttribute("aria-haspopup", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Xəritə fonu seçimi");
      toggle.title = "Xəritə fonu seçimi";
      const layerIcon = icon({ prefix: "fas", iconName: "layer-group" });
      if (layerIcon.node[0]) toggle.appendChild(layerIcon.node[0]);
      toggle.addEventListener("click", () => (this.isOpen() ? this.close() : this.open()));
      container.appendChild(toggle);
      this.toggle = toggle;

      // Panel with one radio per basemap. Native radios give arrow-key
      // navigation and radiogroup semantics for free.
      const panel = L.DomUtil.create("div", "wlm-basemap-panel") as HTMLDivElement;
      panel.setAttribute("role", "radiogroup");
      panel.setAttribute("aria-label", "Xəritə fonu");
      panel.hidden = true;
      this.entries.forEach((entry, index) => {
         const label = document.createElement("label");
         label.className = "wlm-basemap-item";

         const radio = document.createElement("input");
         radio.type = "radio";
         radio.name = "wlm-basemap";
         radio.value = String(index);
         radio.checked = entry.layer === this.current;
         radio.addEventListener("change", () => {
            if (radio.checked) this.select(index);
         });

         const text = document.createElement("span");
         text.textContent = entry.name;

         label.append(radio, text);
         panel.appendChild(label);
      });
      panel.addEventListener("keydown", (e: KeyboardEvent) => {
         if (e.key === "Escape") {
            this.close();
            this.toggle?.focus();
         }
      });
      container.appendChild(panel);
      this.panel = panel;

      // Keep clicks on the control from reaching the map (pan/click handlers).
      L.DomEvent.disableClickPropagation(container);

      return container;
   }

   onRemove(): void {
      this.stopOutsideClose();
      this.mapInstance = null;
      this.container = null;
      this.panel = null;
      this.toggle = null;
   }

   private isOpen(): boolean {
      return !!this.panel && !this.panel.hidden;
   }

   private open(): void {
      if (!this.panel || !this.toggle) return;
      this.panel.hidden = false;
      this.toggle.setAttribute("aria-expanded", "true");
      // Raise this control above its siblings while the panel overlaps them.
      this.container?.classList.add("wlm-basemap-control--open");
      // The checked radio is the group's tab stop; focus it so keyboard
      // users land inside the group.
      this.panel.querySelector<HTMLInputElement>("input:checked")?.focus();
      // Close on any click outside the control. Capture phase, because
      // marker clicks stop propagation before bubble listeners would run.
      this.outsideClose = (e: Event) => {
         if (this.container && !this.container.contains(e.target as Node)) this.close();
      };
      document.addEventListener("click", this.outsideClose, true);
   }

   private close(): void {
      if (!this.panel || !this.toggle) return;
      this.panel.hidden = true;
      this.toggle.setAttribute("aria-expanded", "false");
      this.container?.classList.remove("wlm-basemap-control--open");
      this.stopOutsideClose();
   }

   private stopOutsideClose(): void {
      if (this.outsideClose) {
         document.removeEventListener("click", this.outsideClose, true);
         this.outsideClose = null;
      }
   }

   /** Swaps the visible basemap and fires the standard change event. */
   private select(index: number): void {
      const map = this.mapInstance;
      const entry = this.entries[index];
      if (!map || !entry || entry.layer === this.current) return;
      map.removeLayer(this.current);
      map.addLayer(entry.layer);
      this.current = entry.layer;
      map.fire("baselayerchange", { layer: entry.layer });
      this.close();
      this.toggle?.focus();
   }
}
