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
WHERE {
  ?item wdt:P13410 ?inventory.
  OPTIONAL { ?item wdt:P625 ?coordinate. }
  
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P373 ?commonsCategory. }
  OPTIONAL { ?azLink schema:about ?item ; schema:isPartOf <https://az.wikipedia.org/> . }
  OPTIONAL { ?commonsLink schema:about ?item ; schema:isPartOf <https://commons.wikimedia.org/> . }

  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "az,en". 
  }
}
`;

interface SparqlBinding {
  item: { value: string };
  itemLabel: { value: string };
  itemDescription?: { value: string };
  itemAltLabel?: { value: string };
  inventory: { value: string };
  coordinate?: { value: string };
  image?: { value: string };
  commonsCategory?: { value: string };
  azLink?: { value: string };
  commonsLink?: { value: string };
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    item: string;
    itemLabel: string;
    itemDescription?: string;
    itemAltLabel?: string;
    inventory: string;
    image?: string;
    commonsCategory?: string;
    azLink?: string;
    commonsLink?: string;
    [key: string]: any;
  };
}

interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

async function fetchMonuments() {
  console.log('Fetching data from Wikidata...');
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL_QUERY)}&format=json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WLMAZ-Updater/1.0 (https://github.com/nemoralis/wlmaz)',
      'Accept': 'application/sparql-results+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings as SparqlBinding[];
}

function transformToGeoJSON(bindings: SparqlBinding[]): GeoJSON {
  const features: GeoJSONFeature[] = bindings
    .filter(b => b.coordinate) // Filter out items without coordinates
    .map((b): GeoJSONFeature | null => {
      const wkt = b.coordinate!.value;
      const match = wkt.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
      if (!match) return null;
      
      const lon = parseFloat(match[1]);
      const lat = parseFloat(match[2]);

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          item: b.item.value,
          itemLabel: b.itemLabel.value,
          itemDescription: b.itemDescription?.value,
          itemAltLabel: b.itemAltLabel?.value,
          inventory: b.inventory.value,
          image: b.image?.value,
          commonsCategory: b.commonsCategory?.value,
          azLink: b.azLink?.value,
          commonsLink: b.commonsLink?.value
        }
      };
    })
    .filter((f): f is GeoJSONFeature => f !== null);

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
    const bindings = await fetchMonuments();
    const newData = transformToGeoJSON(bindings);

    // 3. Compare and calculate stats
    if (existingData) {
      const existingIds = new Set(existingData.features.map(f => f.properties.item));
      const newIds = new Set(newData.features.map(f => f.properties.item));

      let added = 0;
      let removed = 0;
      let updated = 0;

      // Added
      for (const id of newIds) {
        if (!existingIds.has(id)) added++;
      }

      // Removed
      for (const id of existingIds) {
        if (!newIds.has(id)) removed++;
      }

      // Updated (simplified check: if ID exists in both, we assume it might be updated. 
      // For a deep check, we would compare properties, but for now let's just count potential updates 
      // or just say "Refreshed X items")
      // Actually, let's do a property comparison for a few key fields to be more accurate.
      for (const newFeature of newData.features) {
        const id = newFeature.properties.item;
        if (existingIds.has(id)) {
          const existingFeature = existingData.features.find(f => f.properties.item === id);
          if (existingFeature) {
             // Simple JSON stringify comparison for properties
             if (JSON.stringify(newFeature.properties) !== JSON.stringify(existingFeature.properties) ||
                 JSON.stringify(newFeature.geometry) !== JSON.stringify(existingFeature.geometry)) {
               updated++;
             }
          }
        }
      }

      console.log('--- Update Statistics ---');
      console.log(`Total Monuments: ${newData.features.length}`);
      console.log(`Added: ${added}`);
      console.log(`Removed: ${removed}`);
      console.log(`Updated: ${updated}`);
      console.log('-------------------------');
    } else {
      console.log(`Fetched ${newData.features.length} monuments.`);
    }

    // 4. Save new data
    await fs.writeFile(GEOJSON_PATH, JSON.stringify(newData, null, 4));
    console.log(`Saved updated GeoJSON to ${GEOJSON_PATH}`);

  } catch (error) {
    console.error('Error updating monuments:', error);
    process.exit(1);
  }
}

main();
