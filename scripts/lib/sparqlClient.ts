/**
 * Minimal Wikidata SPARQL client.
 *
 * Owns the HTTP surface of the data pipeline (endpoint, headers, retrying) so
 * the transformation logic stays free of I/O.
 */

export interface SparqlValue {
   type: string;
   value: string;
   datatype?: string;
}

export interface SparqlBinding {
   [key: string]: SparqlValue;
}

export interface SparqlResults {
   results: {
      bindings: SparqlBinding[];
   };
}

/** The query endpoint the daily data update reads from. */
export const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

/** Called with the cumulative byte count; `total` is null when size is unknown. */
export type ProgressCallback = (loaded: number, total: number | null) => void;

/**
 * Reads the response body as text, reporting byte progress.
 *
 * The big monument query streams without a `Content-Length` header, so `total`
 * is usually null and callers must cope with an unknown size. When a body
 * stream is unavailable (never in Node, but cheap to support) the whole buffer
 * is read at once and reported in one step.
 */
const readBody = async (response: Response, onProgress?: ProgressCallback): Promise<string> => {
   const lengthHeader = response.headers.get("content-length");
   const total = lengthHeader ? Number(lengthHeader) : null;

   if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      onProgress?.(bytes.byteLength, total);
      return new TextDecoder().decode(bytes);
   }

   const reader = response.body.getReader();
   const chunks: Uint8Array[] = [];
   let loaded = 0;

   onProgress?.(0, total);
   for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
   }

   const body = new Uint8Array(loaded);
   let offset = 0;
   for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
   }
   return new TextDecoder().decode(body);
};

export class SPARQLQueryDispatcher {
   endpoint: string;
   maxRetries: number;

   constructor(endpoint: string, maxRetries = 3) {
      this.endpoint = endpoint;
      this.maxRetries = maxRetries;
   }

   async query(sparqlQuery: string, onProgress?: ProgressCallback): Promise<SparqlResults> {
      const fullUrl = this.endpoint + "?query=" + encodeURIComponent(sparqlQuery);
      const headers = {
         Accept: "application/sparql-results+json",
         // Ask for an uncompressed body: the progress callback counts raw
         // bytes, and undici decompresses transparently, which would make any
         // Content-Length (and the counted total) meaningless.
         "Accept-Encoding": "identity",
         "User-Agent": "WLMAZ-Updater/1.0 (https://gitlab.wikimedia.org/nmw03/wlmaz)",
      };

      // Large result sets occasionally arrive truncated over the network; retry
      // the request a few times before giving up.
      for (let attempt = 1; ; attempt++) {
         const response = await fetch(fullUrl, { headers });
         if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
         }
         try {
            const body = await readBody(response, onProgress);
            return JSON.parse(body) as SparqlResults;
         } catch (error) {
            if (attempt >= this.maxRetries) {
               throw error;
            }
            console.warn(
               `Response corrupted on attempt ${attempt}/${this.maxRetries}, retrying...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
         }
      }
   }
}
