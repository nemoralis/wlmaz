import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const GEOJSON_PATH = path.join(PUBLIC_DIR, 'monuments.geojson');

// SPARQL Query to fetch monuments in Azerbaijan
const SPARQL_QUERY = `#defaultView:Map
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
  ?lastModified # Last edit of Wikidata item
WHERE {
  ?item wdt:P13410 ?inventory.
  
  # 2. Add this triple to get the date
  ?item schema:dateModified ?lastModified .
  
  # 1. Coordinates
  OPTIONAL { ?item wdt:P625 ?coordinate. }
  
  # 2. Image
  OPTIONAL { ?item wdt:P18 ?image. }
  
  # 3. Commons Category Name
  OPTIONAL { ?item wdt:P373 ?commonsCategory. }

  # 4. Sitelinks
  OPTIONAL { ?azLink schema:about ?item ; schema:isPartOf <https://az.wikipedia.org/> . }
  OPTIONAL { ?commonsLink schema:about ?item ; schema:isPartOf <https://commons.wikimedia.org/> . }

  # 5. Labels, Descriptions, Aliases
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
    }

  } catch (error) {
    console.error('Error updating monuments:', error);
    process.exit(1);
  }
}

main();
