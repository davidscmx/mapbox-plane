import mapboxgl from 'mapbox-gl';
import { MAPBOX_CONFIG, MAP_STYLES, TERRAIN_SOURCES } from '../config/mapbox.js';

export class MapService {
  constructor() {
    this.map = null;
    this.isInitialized = false;
    this.eventListeners = new Map();
    
    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
  }

  /**
   * Initialize the Mapbox map with 3D terrain
   */
  async initialize(container) {
    try {
      this.map = new mapboxgl.Map({
        container: container,
        style: MAPBOX_CONFIG.style,
        center: MAPBOX_CONFIG.center,
        zoom: MAPBOX_CONFIG.zoom,
        pitch: MAPBOX_CONFIG.pitch,
        bearing: MAPBOX_CONFIG.bearing,
        maxZoom: MAPBOX_CONFIG.maxZoom,
        minZoom: MAPBOX_CONFIG.minZoom,
        antialias: true,
        projection: 'globe' // Enable globe projection for better 3D effect
      });

      // Wait for map to load
      await new Promise((resolve) => {
        this.map.on('load', resolve);
      });

      // Add terrain sources
      this.addTerrainSources();
      
      // Enable 3D terrain
      this.enable3DTerrain();
      
      // Add navigation controls
      this.addControls();
      
      // Add atmosphere for globe view
      this.addAtmosphere();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      console.log('✈️ MapService initialized successfully');
      
      return this.map;
    } catch (error) {
      console.error('❌ Failed to initialize MapService:', error);
      throw error;
    }
  }

  /**
   * Add terrain data sources
   */
  addTerrainSources() {
    Object.entries(TERRAIN_SOURCES).forEach(([id, source]) => {
      if (!this.map.getSource(id)) {
        this.map.addSource(id, source);
      }
    });
  }

  /**
   * Enable 3D terrain visualization
   */
  enable3DTerrain() {
    this.map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: MAPBOX_CONFIG.terrain.exaggeration
    });
  }

  /**
   * Add map controls
   */
  addControls() {
    // Navigation control (zoom, rotation, pitch)
    this.map.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true
    }), 'top-left');

    // Fullscreen control
    this.map.addControl(new mapboxgl.FullscreenControl(), 'top-left');

    // Scale control
    this.map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Geolocate control
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-left');
  }

  /**
   * Add atmospheric effects for globe view
   */
  addAtmosphere() {
    this.map.setFog({
      'range': [0.8, 8],
      'color': '#dc9f9f',
      'horizon-blend': 0.5,
      'high-color': '#245bde',
      'space-color': '#000b19',
      'star-intensity': 0.15
    });
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Map click handler
    this.map.on('click', (e) => {
      this.emit('mapClick', {
        lngLat: e.lngLat,
        point: e.point
      });
    });

    // Map move handler
    this.map.on('move', () => {
      this.emit('mapMove', {
        center: this.map.getCenter(),
        zoom: this.map.getZoom(),
        pitch: this.map.getPitch(),
        bearing: this.map.getBearing()
      });
    });

    // Zoom change handler
    this.map.on('zoom', () => {
      this.emit('zoomChange', this.map.getZoom());
    });
  }

  /**
   * Change map style
   */
  setStyle(styleId) {
    if (MAP_STYLES[styleId]) {
      this.map.setStyle(MAP_STYLES[styleId]);
      
      // Re-add terrain after style change
      this.map.once('styledata', () => {
        this.addTerrainSources();
        this.enable3DTerrain();
      });
    }
  }

  /**
   * Fly to a specific location
   */
  flyTo(options) {
    const defaultOptions = {
      duration: MAPBOX_CONFIG.animationDuration,
      essential: true
    };
    
    this.map.flyTo({ ...defaultOptions, ...options });
  }

  /**
   * Add a custom layer to the map
   */
  addLayer(layer, beforeId) {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer, beforeId);
    }
  }

  /**
   * Remove a layer from the map
   */
  removeLayer(layerId) {
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
  }

  /**
   * Add a source to the map
   */
  addSource(id, source) {
    if (!this.map.getSource(id)) {
      this.map.addSource(id, source);
    }
  }

  /**
   * Remove a source from the map
   */
  removeSource(id) {
    if (this.map.getSource(id)) {
      this.map.removeSource(id);
    }
  }

  /**
   * Get current map bounds
   */
  getBounds() {
    return this.map.getBounds();
  }

  /**
   * Get current map center
   */
  getCenter() {
    return this.map.getCenter();
  }

  /**
   * Get current zoom level
   */
  getZoom() {
    return this.map.getZoom();
  }

  /**
   * Convert coordinates to screen pixels
   */
  project(lngLat) {
    return this.map.project(lngLat);
  }

  /**
   * Convert screen pixels to coordinates
   */
  unproject(point) {
    return this.map.unproject(point);
  }

  /**
   * Event emitter functionality
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        callback(data);
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

