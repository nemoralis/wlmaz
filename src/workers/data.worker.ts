import geobuf from "geobuf";
import Pbf from "pbf";
import Fuse from "fuse.js";

self.onmessage = async (e) => {
    if (e.data.type === "INIT") {
        try {
            const response = await fetch("/monuments.pbf");
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const geoData = geobuf.decode(new Pbf(buffer));

            if (geoData.type !== "FeatureCollection") {
                throw new Error("Data is not a FeatureCollection");
            }

            const allFeatures = geoData.features;

            // Initialize Fuse Index
            const fuseIndex = Fuse.createIndex(
                ["properties.itemLabel", "properties.inventory", "properties.itemAltLabel"],
                allFeatures
            );

            // We can't transfer the full Fuse instance, but we can transfer the index
            // and the data, then reconstruct Fuse on the main thread lightly.
            // OR better: we can run search IN the worker.
            // For now, let's just offload the decoding and maybe search later.
            // Actually, passing the huge JSON back to main thread is also costly (Structured Clone).
            // But it's better than blocking the UI during decode.

            self.postMessage({
                type: "DATA_READY",
                geoData,
                fuseIndex: fuseIndex.toJSON(),
            });
        } catch (err) {
            self.postMessage({
                type: "ERROR",
                error: err instanceof Error ? err.message : "Unknown error",
            });
        }
    } else if (e.data.type === "SEARCH") {
        // Future optimization: Run search here
    }
};
