import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { MonumentFeature, MonumentGeoData } from "@/types";
import type { WorkerRequest, WorkerResponse } from "@/types/worker.ts";

const mockState = vi.hoisted(() => ({
   worker: null as null | {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
      messages: WorkerRequest[];
   },
}));

vi.mock("@/workers/data.worker.ts?worker", () => ({
   default: class MockWorker {
      onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      messages: WorkerRequest[] = [];

      constructor() {
         mockState.worker = this;
      }

      postMessage(message: WorkerRequest) {
         this.messages.push(message);
      }
   },
}));

const feature = (label: string): MonumentFeature =>
   ({
      type: "Feature",
      properties: { itemLabel: label, inventory: [label] },
      geometry: { type: "Point", coordinates: [0, 0] },
   }) as MonumentFeature;

const dataReady = (): WorkerResponse => ({
   type: "DATA_READY",
   geoData: { type: "FeatureCollection", features: [] } as MonumentGeoData,
});

const searchResults = (requestId: number, label: string): WorkerResponse => ({
   type: "SEARCH_RESULTS",
   requestId,
   query: label,
   results: [feature(label)],
});

const deliver = (message: WorkerResponse) => {
   mockState.worker?.onmessage?.(new MessageEvent("message", { data: message }));
};

beforeEach(() => {
   setActivePinia(createPinia());
});

describe("monument store search", () => {
   it("ignores a stale worker response from an older query", async () => {
      vi.resetModules();
      const { useMonumentStore: freshStore } = await import("@/stores/monuments.ts");
      const store = freshStore();

      store.init();
      const worker = mockState.worker;
      expect(worker).not.toBeNull();

      deliver(dataReady());
      expect(store.isDataReady).toBe(true);

      store.search("first");
      store.search("second");
      expect(worker?.messages).toEqual([
         { type: "INIT" },
         { type: "SEARCH", query: "first", requestId: 1 },
         { type: "SEARCH", query: "second", requestId: 2 },
      ]);

      // A slow answer for "first" arrives after "second" was requested.
      deliver(searchResults(1, "first"));
      expect(store.searchResults).toHaveLength(0);

      deliver(searchResults(2, "second"));
      expect(store.searchResults.map((f) => f.properties.itemLabel)).toEqual(["second"]);
   });
});
