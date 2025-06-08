// Mapbox Configuration
export const MAPBOX_CONFIG = {
  // You'll need to set your Mapbox access token
  // Get one free at: https://account.mapbox.com/access-tokens/
  accessToken: process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', // Demo token
  
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  
  // Initial view settings
  center: [-74.006, 40.7128], // New York City
  zoom: 2,
  pitch: 60,
  bearing: 0,
  
  // 3D terrain settings
  terrain: {
    source: 'mapbox-dem',
    exaggeration: 1.5
  },
  
  // Performance settings
  maxZoom: 18,
  minZoom: 1,
  
  // Animation settings
  animationDuration: 2000,
  
  // Flight visualization settings
  flightSettings: {
    maxVisibleFlights: 1000,
    updateInterval: 5000, // 5 seconds
    trailLength: 10, // Number of position points for flight trails
    altitudeScale: 0.1, // Scale factor for altitude visualization
    minAltitudeForDisplay: 1000, // Minimum altitude in feet to display
  }
};

// Map style presets
export const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1'
};

// Terrain sources
export const TERRAIN_SOURCES = {
  'mapbox-dem': {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    maxzoom: 14
  }
};

