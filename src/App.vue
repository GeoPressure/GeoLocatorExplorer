<template>
  <div class="d-flex vh-100">
    <!-- Left Sidebar -->
    <div class="bg-dark text-white p-4 overflow-auto" style="width: 32rem">
      <div class="d-flex align-items-center mb-2">
        <img
          src="/logo.svg"
          alt="GeoLocator Logo"
          style="max-width: 40px"
          class="bg-white rounded-circle p-1 me-2"
        />
        <h2 class="h4 fw-bold mb-0">GeoLocatorExplorer</h2>
      </div>
      <p style="color: #f8f9fa">
        Visualize the pressurepath (3D trajectory on an hourly basis) constructed from pressure
        sensor for all datapackage. Simply click on <i class="bi bi-cloud-download"></i>, and
        navigate the map in 3D.
      </p>
      <div v-if="loading_records">Loading datapackages...</div>
      <div v-else>
        <div class="list-group">
          <!-- List of records will be rendered here dynamically -->
          <div
            v-for="(record, index) in records"
            :key="record.id"
            class="list-group-item list-group-item-action rounded mb-2 hover"
          >
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">{{ record.title }}</h5>
              <button
                v-if="record.loading === 0"
                class="btn btn-link p-0"
                @click="loadDataRecord(index)"
                aria-label="Load data"
              >
                <i class="bi bi-cloud-download"></i>
              </button>

              <!-- Spinner while loading -->
              <div
                v-else-if="record.loading === 1"
                class="d-flex align-items-center"
                role="status"
                aria-live="polite"
              >
                <div
                  class="spinner-border text-primary"
                  style="width: 1.5rem; height: 1.5rem"
                  aria-hidden="true"
                ></div>
                <span class="visually-hidden">Loading...</span>
              </div>

              <!-- Icon when data is loaded -->
              <div v-else-if="record.loading === 2" class="d-flex align-items-center">
                <i class="bi bi-check-circle text-success"></i>
              </div>
            </div>
            <p class="mb-1">
              <span v-for="(creator, index) in record.creators" :key="creator.orcid || index">
                <span :title="creator.affiliation || ''">{{ creator.name }}</span>

                <!-- ORCID link with logo -->
                <a
                  v-if="creator.orcid"
                  :href="'https://orcid.org/' + creator.orcid"
                  target="_blank"
                  title="View ORCID"
                >
                  <img src="/ORCID_iD.svg" alt="ORCID" class="orcid-logo" />
                </a>

                <!-- Add comma between authors -->
                <span v-if="index < record.creators.length - 1">, </span>
              </span>
            </p>
            <!--<small v-html="record.description"></small>-->

            <small class="text-muted">
              <i class="bi bi-calendar-range"></i>
              {{ record.temporal.start }} – {{ record.temporal.end }}
            </small>
            <span v-for="tax in record.taxonomic" :key="tax"> </span>
            <div class="d-flex flex-wrap gap-2 align-items-center mb-1">
              <i class="bi bi-feather"></i>
              <span v-for="tax in record.taxonomic" :key="tax">
                <span class="badge bg-secondary rounded-pill">{{ tax }}</span>
              </span>
            </div>
            <p>
              <a :href="'https://doi.org/' + record.doi" target="_blank">
                <img :src="'https://zenodo.org/badge/DOI/' + record.doi + '.svg'" alt="DOI" />
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Map Area -->
    <div class="flex-grow-1 bg-light">
      <div id="map" class="h-100 w-100"></div>
      <!-- Map container -->
    </div>
  </div>
</template>

<script>
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Papa from "papaparse"; // Import PapaParse
import pako from "pako";
import { Threebox } from "threebox-plugin";
import chroma from "chroma-js";

export default {
  data() {
    return {
      records: [], // List of records fetched from the Zenodo API
      map: null,
      exaggeration: 12,
      loading_records: true,
    };
  },
  mounted() {
    this.fetchRecords();

    // Set Mapbox access token
    mapboxgl.accessToken = "pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g";

    // Initialize the Mapbox map
    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [0, 0], // Initial center (longitude, latitude)
      zoom: 1, // Initial zoom level
      pitch: 0, // Tilt for 3D view
      bearing: 0, // Orientation of the map
    });

    // Load the CSV data and add the polyline
    this.map.on("load", () => {
      // Add terrain for a 3D effect
      this.map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.terrain-rgb",
        tileSize: 512,
        maxzoom: 14,
      });

      this.map.setTerrain({ source: "mapbox-dem", exaggeration: this.exaggeration });
    });
  },
  methods: {
    async loadCsvData() {
      try {
        // Fetch the CSV data using PapaParse
        const response = await fetch(this.csvUrl);
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
          Papa.parse(csvText, {
            header: true, // Use header row for field names
            dynamicTyping: true, // Automatically convert values to numbers where possible
            skipEmptyLines: true, // Skip empty rows
            complete: (results) => {
              const rows = results.data;
              const coordinates = rows.reduce((acc, row) => {
                const { lon, lat, altitude, tag_id } = row;
                if (!isNaN(lon) && !isNaN(lat) && !isNaN(altitude) && tag_id) {
                  // Convert to [lon, lat, alt] with altitude adjusted
                  const coordinate = [lon, lat, altitude * this.exaggeration];

                  // Initialize the array if tag_id is encountered for the first time
                  if (!acc[tag_id]) {
                    acc[tag_id] = [];
                  }
                  // Append the coordinate to the corresponding tag_id
                  acc[tag_id].push(coordinate);
                }
                return acc;
              }, {});
              resolve(coordinates);
            },
            error: (error) => {
              console.error("Error parsing CSV:", error);
              reject([]);
            },
          });
        });
      } catch (error) {
        console.error("Error loading CSV data:", error);
        return [];
      }
    },
    async fetchRecords() {
      const url = "https://zenodo.org/api/records?communities=geolocator-dp";
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error fetching records: ${response.statusText}`);
        }
        const data = await response.json();
        const recordsWithNulls = await Promise.all(
          data.hits.hits.map(async (record) => {
            let files = record.files.reduce((acc, f) => {
              const {
                key,
                links: { self },
              } = f;
              acc[key] = self;
              return acc;
            }, {});

            if (!files["datapackage.json"]) {
              console.warn("No datapackage.json found for record:", record.metadata.title);
              return null;
            }

            try {
              const response = await fetch(files["datapackage.json"]);
              const datapackage = await response.json();
              record = { ...record, ...datapackage };

              let description = "";
              if (record.metadata.description) {
                description = record.metadata.description;
              }
              const MAX_LENGTH = 150;
              if (description.length > MAX_LENGTH) {
                description = description.substring(0, MAX_LENGTH).trim() + "...";
              }
              record.creators = record.metadata.creators;
              record.description = description;

              record.taxonomic = Array.isArray(record.taxonomic)
                ? record.taxonomic
                : [record.taxonomic];

              record.doi = record.doi;
              record.tags = null;
              record.staps = null;
              record.paths = null;
              record.pressurepaths = null;
              record.loading = 0;
              record.files = files;

              console.log(record.taxonomic);
              return record;
            } catch (error) {
              console.error("Error loading datapackage.json:", error);
              return null;
            }
          })
        );

        // Filter out null records
        this.records = recordsWithNulls.filter((record) => record !== null);
      } catch (err) {
        console.log(err);
      } finally {
        this.loading_records = false;
        this.plotSpatial();
      }
    },
    loadDataRecord(index) {
      this.records[index].loading = 1;
      // List of CSV files we need to fetch and parse
      // const csvFiles = ["tags", "staps", "paths"];
      const csvFiles = ["pressurepaths"];

      // Helper function to fetch and parse a CSV file
      const fetchAndParseCSV = (filePath, fileKey) => {
        return new Promise((resolve, reject) => {
          // Check if the file path includes ".csv.gz" (not just ends with)
          const isGzipped = filePath.includes(".csv.gz");
          fetch(filePath)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Network response was not ok for ${filePath}`);
              }
              // If the file is gzipped, return the binary data (arrayBuffer)
              if (isGzipped) {
                return response.arrayBuffer();
              } else {
                // Otherwise, return the file as plain text (for regular .csv)
                return response.text();
              }
            })
            .then((data) => {
              let csvText;

              // If data is in binary (arrayBuffer), decompress using pako
              if (isGzipped) {
                const decompressedData = pako.ungzip(new Uint8Array(data), { to: "string" });
                csvText = decompressedData;
              } else {
                // If it's not gzipped, use the data as is (CSV text)
                csvText = data;
              }

              //console.log(csvText);
              // Parse the CSV text using PapaParse
              Papa.parse(csvText, {
                complete: (result) => {
                  this.records[index][fileKey] = result.data; // Optionally store the data in Vue's data object
                  resolve(); // Resolve the Promise when parsing is complete
                },
                header: true, // Assuming the CSV files have headers
              });
            })
            .catch((error) => {
              console.error(`Error fetching or parsing ${fileKey} CSV:`, error);
              reject(error); // Reject the Promise on error
            });
        });
      };

      // Create an array of promises for fetching and parsing all CSV files
      const promises = csvFiles.map((fileKey) => {
        const fileName = Object.keys(this.records[index].files).find((key) => {
          return key.includes(fileKey);
        });
        const filePath = this.records[index].files[fileName]; // Get the file path from the record
        if (this.records[index].loading == 2) {
          console.error(`Record ${fileKey} already loaded.`);
          return Promise.resolve();
        } else if (filePath) {
          return fetchAndParseCSV(filePath, fileKey); // Call the helper function for each file
        } else {
          console.error(`File ${fileKey} not found in the record.`);
          return Promise.reject(new Error(`File ${fileKey} not found in the record.`)); // Reject if file is missing
        }
      });

      // Wait for all CSV files to be fetched and parsed
      Promise.all(promises)
        .then(() => {
          // All CSV files have been loaded and parsed, now call plotPathsOnMap
          this.records[index].loading = 2;
          this.plotPathsOnMap();
        })
        .catch((error) => {
          // Handle any errors that occurred during fetch or parsing
          console.error("Error loading CSV files:", error);
          this.records[index].loading = 3;
        });
    },
    plotPathsOnMap() {
      const p = this.records.map((r) => r.pressurepaths).flat();

      const coordinates = p.reduce((acc, row) => {
        if (row) {
          const { lon, lat, altitude, tag_id } = row;
          if (!isNaN(lon) && !isNaN(lat) && !isNaN(altitude) && tag_id) {
            // Convert to [lon, lat, alt] with altitude adjusted
            const coordinate = [
              Number(lon),
              Number(lat),
              Math.round(Number(altitude) * this.exaggeration),
            ];

            // Initialize the array if tag_id is encountered for the first time
            if (!acc[tag_id]) {
              acc[tag_id] = [];
            }
            // Append the coordinate to the corresponding tag_id
            acc[tag_id].push(coordinate);
          }
        }
        return acc;
      }, {});

      console.log(coordinates);

      const tb = new Threebox(this.map, this.map.getCanvas().getContext("webgl"), {
        defaultLights: true,
      });

      const tagIds = Object.keys(coordinates); // Extract unique tag_ids
      const colorScale = chroma.scale("spectral").domain([0, tagIds.length - 1]); // Create a color scale

      tagIds.forEach((tagId, index) => {
        const coordinates_tag = coordinates[tagId]; // Get coordinates for the tag_id
        const color = colorScale(index).hex(); // Assign a unique color using chroma
        tb.add(
          tb.line({
            geometry: coordinates_tag,
            color: color,
            width: 6,
            opacity: 1,
          })
        );
      });

      if (this.map.getLayer("pressurepaths")) {
        this.map.removeLayer("pressurepaths");
      }

      this.map.addLayer({
        id: "pressurepaths",
        type: "custom",
        renderingMode: "3d",
        render: (gl, matrix) => {
          tb.update();
        },
      });
    },
    plotSpatial() {
      this.records.forEach((record) => {
        if (record && record.spatial) {
          const sourceId = "polygon-" + record.id;
          const layerId = "polygon-outline-" + record.id;

          this.map.addSource(sourceId, {
            type: "geojson",
            data: record.spatial,
          });

          this.map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#FFF",
              "line-width": 2,
            },
          });
        }
      });
    },
  },
};
</script>
