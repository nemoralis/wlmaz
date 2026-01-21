import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const GEOJSON_PATH = path.join(PUBLIC_DIR, 'monuments.geojson');

// SPARQL Query to fetch monuments in Azerbaijan
const SPARQL_QUERY = `
SELECT 
  ?item 
  ?itemLabel 
  ?itemDescription 
  ?itemAltLabel 
  ?inventory
  ?coordinate 
  ?image
  ?commonsCategory 
  ?azLink 
  ?commonsLink 
  ?lastModified 
WHERE {
  {
    SELECT 
      ?item 
      (GROUP_CONCAT(DISTINCT ?heritageID; separator=", ") AS ?inventory)  # Combine all IDs
      (SAMPLE(?img) AS ?image)
      (SAMPLE(?coord) AS ?coordinate)
      (SAMPLE(?cat) AS ?commonsCategory)
      (SAMPLE(?az) AS ?azLink)
      (SAMPLE(?cLink) AS ?commonsLink)
      (MAX(?mod) AS ?lastModified)
    WHERE {
      ?item wdt:P13410 ?heritageID.
      
      ?item schema:dateModified ?mod .
      OPTIONAL { ?item wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P18 ?img. }
      OPTIONAL { ?item wdt:P373 ?cat. }
      OPTIONAL { ?az schema:about ?item ; schema:isPartOf <https://az.wikipedia.org/> . }
      OPTIONAL { ?cLink schema:about ?item ; schema:isPartOf <https://commons.wikimedia.org/> . }
    }
    GROUP BY ?item
  }.
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "az,en". 
  }
}`;

class SPARQLQueryDispatcher {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query(sparqlQuery: string): Promise<any> {
    const fullUrl = this.endpoint + '?query=' + encodeURIComponent(sparqlQuery);
    const headers = { 
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'WLMAZ-Updater/1.0 (https://github.com/nemoralis/wlmaz)'
    };

    const response = await fetch(fullUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return response.json();
  }
}

const endpointUrl = 'https://query.wikidata.org/sparql';

interface SparqlValue {
  type: string;
  value: string;
  datatype?: string;
  [key: string]: any;
}

interface SparqlBinding {
  [key: string]: SparqlValue;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    [key: string]: string;
  };
}

interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function transformToGeoJSON(bindings: SparqlBinding[]): GeoJSON {
  const features: GeoJSONFeature[] = [];

  for (const row of bindings) {
    const properties: { [key: string]: string } = {};
    let coordinates: [number, number] | null = null;

    for (const rowVar in row) {
      const binding = row[rowVar];
      
      // Check for WKT literal (coordinates)
      if (binding.type === 'literal' && binding.datatype === 'http://www.opengis.net/ont/geosparql#wktLiteral') {
        const match = binding.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (match) {
          coordinates = [parseFloat(match[1]), parseFloat(match[2])];
        }
      } else {
        // Add other fields to properties
        properties[rowVar] = binding.value;
      }
    }

    // Only add feature if coordinates were found
    if (coordinates) {
      const sortedProperties = Object.keys(properties).sort().reduce((obj, key) => { 
          obj[key] = properties[key]; 
          return obj;
      }, {} as { [key: string]: string });

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        properties: sortedProperties
      });
    }
  }

  // Sort features by inventory number
  features.sort((a, b) => {
    const invA = a.properties.inventory || '';
    const invB = b.properties.inventory || '';
    return invA.localeCompare(invB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

async function main() {
  try {
    // 1. Load existing data
    let existingData: GeoJSON | null = null;
    try {
      const fileContent = await fs.readFile(GEOJSON_PATH, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.log('No existing GeoJSON found or invalid JSON.');
    }

    // 2. Fetch new data
    console.log('Fetching data from Wikidata...');
    const queryDispatcher = new SPARQLQueryDispatcher( endpointUrl );
    const data = await queryDispatcher.query( SPARQL_QUERY );
    const bindings = data.results.bindings as SparqlBinding[];
    
    const newData = transformToGeoJSON(bindings);

    // 3. Compare and calculate stats
    // 3. Compare and calculate stats
    let added = 0;
    let removed = 0;

    if (existingData) {
      const existingIds = new Set(existingData.features.map(f => f.properties.inventory));
      const newIds = new Set(newData.features.map(f => f.properties.inventory));

      // Added
      for (const id of newIds) {
        if (!existingIds.has(id)) added++;
      }

      // Removed
      for (const id of existingIds) {
        if (!newIds.has(id)) removed++;
      }

      console.log('--- Update Statistics ---');
      console.log(`Total Monuments: ${newData.features.length}`);
      console.log(`Added: ${added}`);
      console.log(`Removed: ${removed}`);
      console.log('-------------------------');

      // Check if data has actually changed
      const hasChanges = added > 0 || removed > 0 || 
         JSON.stringify(existingData) !== JSON.stringify(newData);

      if (!hasChanges) {
         console.log('No changes detected. Skipping file update.');
         process.exit(0);
      }
    } else {
      console.log(`Fetched ${newData.features.length} monuments.`);
    }

    // 4. Save new data
    await fs.writeFile(GEOJSON_PATH, JSON.stringify(newData, null, 4));
    console.log(`Saved updated GeoJSON to ${GEOJSON_PATH}`);

    // 5. Save History
    if (existingData) {
       const HISTORY_PATH = path.join(PUBLIC_DIR, 'stats-history.json');
       let history: any[] = [];
       try {
          const content = await fs.readFile(HISTORY_PATH, 'utf-8');
          history = JSON.parse(content);
       } catch (e) {
          // Start new history
          console.log('Starting new history file.');
       }
   
       const today = new Date().toISOString().split('T')[0];
       const withImage = newData.features.filter(f => f.properties.image).length;
       
       const entry = {
          date: today,
          timestamp: Date.now(),
          total: newData.features.length,
          withImage,
          withoutImage: newData.features.length - withImage,
          diff: { 
             added, 
             removed, 
          }
       };
       
       // Remove existing entry for same date to allow re-runs
       history = history.filter(h => h.date !== today);
       history.push(entry);
       
       // Sort by date
       history.sort((a, b) => a.timestamp - b.timestamp);
       
       await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
       console.log(`Saved update stats to ${HISTORY_PATH}`);

       // 6. Notify IndexNow
       await notifyIndexNow(existingData, newData);
    }
  } catch (error) {
    console.error('Error updating monuments:', error);
    process.exit(1);
  }
}

// IndexNow Configuration
const INDEXNOW_HOST = 'wikilovesmonuments.az';
const INDEXNOW_KEY = '883777591e1d4511855a43256080287e';
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

async function notifyIndexNow(oldData: GeoJSON, newData: GeoJSON) {
   console.log('--- IndexNow Notification ---');
   const changedUrls: string[] = [];
   const oldMap = new Map(oldData.features.map(f => [f.properties.inventory, f]));
   const forceIndex = process.argv.includes('--force-index');

   if (forceIndex) {
      console.log('Force index enabled: Submitting ALL monuments.');
   }

   // Find added and modified
   for (const feature of newData.features) {
      const inv = feature.properties.inventory;
      const oldFeature = oldMap.get(inv);
      
      const url = `https://${INDEXNOW_HOST}/monument/${inv.replace(/\./g, "%2E")}`;

      if (forceIndex) {
         changedUrls.push(url);
      } else if (!oldFeature) {
         // Added
         changedUrls.push(url);
      } else if (JSON.stringify(oldFeature.properties) !== JSON.stringify(feature.properties)) {
         // Modified
         changedUrls.push(url);
      }
   }

   // Always add homepage and table page if there are changes
   if (changedUrls.length > 0) {
      changedUrls.push(`https://${INDEXNOW_HOST}/`);
      changedUrls.push(`https://${INDEXNOW_HOST}/table`);
   }

   if (changedUrls.length === 0) {
      console.log('No URLs to index.');
      return;
   }

   console.log(`Notifying IndexNow for ${changedUrls.length} URLs...`);
   
   // IndexNow allows up to 10,000 URLs per request. 
   // We'll slice if necessary, but unlikely for this use case.
   const batches = [];
   while (changedUrls.length > 0) {
      batches.push(changedUrls.splice(0, 10000));
   }

   for (const batch of batches) {
      try {
         const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
               host: INDEXNOW_HOST,
               key: INDEXNOW_KEY,
               keyLocation: INDEXNOW_KEY_LOCATION,
               urlList: batch,
            }),
         });

         if (response.ok) {
            console.log(`✅ IndexNow success: Sent ${batch.length} URLs`);
         } else {
            console.error(`❌ IndexNow failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
         }
      } catch (error) {
         console.error('❌ IndexNow error:', error);
      }
   }
}

main();
