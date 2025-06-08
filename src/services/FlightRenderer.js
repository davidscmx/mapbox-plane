import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';
import { FlightAnimation } from '../utils/FlightAnimation.js';
import { getAircraftInfo, getAircraftCategory, getModelScale, getAircraftColor, determineAircraftType } from '../utils/AircraftTypes.js';

/**
 * Flight Renderer Service
 * Handles 3D visualization of aircraft on the map
 */
export class FlightRenderer {
  constructor(mapService) {
    this.mapService = mapService;
    this.map = mapService.map;
    
    this.modelLoader = new ModelLoader();
    this.flightAnimation = new FlightAnimation();
    
    this.aircraftObjects = new Map(); // icao24 -> aircraft object
    this.flightTrails = new Map(); // icao24 -> trail points
    this.selectedAircraft = null;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    this.isInitialized = false;
    this.animationFrameId = null;
    
    // Performance settings
    this.maxVisibleAircraft = 1000;
    this.trailLength = 10;
    this.updateInterval = 100; // ms
    this.lastUpdate = 0;
    
    // Event listeners
    this.eventListeners = new Map();
  }

  /**
   * Initialize the 3D renderer
   */
  async initialize() {
    try {
      console.log('🎨 Initializing Flight Renderer...');
      
      // Wait for map to be ready
      if (!this.map) {
        throw new Error('Map service not initialized');
      }
      
      // Add custom layer to Mapbox
      this.addCustomLayer();
      
      // Preload models
      await this.modelLoader.preloadModels();
      
      this.isInitialized = true;
      console.log('✅ Flight Renderer initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Flight Renderer:', error);
      throw error;
    }
  }

  /**
   * Add custom 3D layer to Mapbox
   */
  addCustomLayer() {
    const customLayer = {
      id: 'aircraft-layer',
      type: 'custom',
      renderingMode: '3d',
      
      onAdd: (map, gl) => {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.Camera();
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        this.addLighting();
        
        console.log('🎭 Custom 3D layer added to map');
      },
      
      render: (gl, matrix) => {
        if (!this.scene || !this.camera || !this.renderer) return;
        
        // Update camera matrix
        this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
        
        // Render the scene
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        
        // Trigger next frame
        this.map.triggerRepaint();
      }
    };
    
    this.map.addLayer(customLayer);
  }

  /**
   * Add lighting to the scene
   */
  addLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Hemisphere light for better ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
    this.scene.add(hemisphereLight);
  }

  /**
   * Update aircraft positions and render
   */
  updateFlights(flights) {
    if (!this.isInitialized || !flights) return;
    
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    
    this.lastUpdate = now;
    
    // Get current map bounds for culling
    const bounds = this.mapService.getBounds();
    
    // Track which aircraft are still active
    const activeAircraft = new Set();
    
    // Limit number of visible aircraft for performance
    const visibleFlights = flights
      .filter(flight => this.isFlightVisible(flight, bounds))
      .slice(0, this.maxVisibleAircraft);
    
    // Update or create aircraft objects
    visibleFlights.forEach(flight => {
      if (!flight.icao24 || !flight.latitude || !flight.longitude) return;
      
      activeAircraft.add(flight.icao24);
      this.updateAircraft(flight);
    });
    
    // Remove aircraft that are no longer active
    for (const icao24 of this.aircraftObjects.keys()) {
      if (!activeAircraft.has(icao24)) {
        this.removeAircraft(icao24);
      }
    }
    
    // Update flight trails
    this.updateFlightTrails();
    
    // Emit update event
    this.emit('flightsRendered', {
      visibleCount: visibleFlights.length,
      totalCount: flights.length,
      activeObjects: this.aircraftObjects.size
    });
  }

  /**
   * Check if flight should be visible
   */
  isFlightVisible(flight, bounds) {
    // Check if within map bounds
    if (flight.longitude < bounds.getWest() || flight.longitude > bounds.getEast() ||
        flight.latitude < bounds.getSouth() || flight.latitude > bounds.getNorth()) {
      return false;
    }
    
    // Check minimum altitude
    if (flight.altitudeFeet && flight.altitudeFeet < 1000) {
      return false;
    }
    
    // Check if on ground
    if (flight.onGround) {
      return false;
    }
    
    return true;
  }

  /**
   * Update or create aircraft object
   */
  updateAircraft(flight) {
    let aircraftObj = this.aircraftObjects.get(flight.icao24);
    
    if (!aircraftObj) {
      // Create new aircraft object
      aircraftObj = this.createAircraftObject(flight);
      this.aircraftObjects.set(flight.icao24, aircraftObj);
      this.scene.add(aircraftObj.group);
    }
    
    // Update position
    this.updateAircraftPosition(aircraftObj, flight);
    
    // Update flight trail
    this.updateFlightTrail(flight);
  }

  /**
   * Create new aircraft 3D object
   */
  createAircraftObject(flight) {
    const group = new THREE.Group();
    
    // Determine aircraft type and get appropriate model
    const aircraftType = determineAircraftType(flight);
    const aircraftInfo = getAircraftInfo(aircraftType);
    const category = getAircraftCategory(aircraftType);
    const color = getAircraftColor(category);
    
    // Get 3D model
    const model = this.modelLoader.getModelForAircraft(aircraftType, category, color);
    group.add(model);
    
    // Add label
    const label = this.createAircraftLabel(flight);
    group.add(label);
    
    // Store metadata
    group.userData = {
      icao24: flight.icao24,
      callsign: flight.callsign,
      aircraftType: aircraftType,
      category: category,
      model: model,
      label: label,
      lastPosition: null,
      trail: []
    };
    
    return {
      group: group,
      model: model,
      label: label,
      lastUpdate: Date.now()
    };
  }

  /**
   * Create aircraft label
   */
  createAircraftLabel(flight) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw label background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    context.textAlign = 'center';
    
    const callsign = flight.callsign || flight.icao24;
    const altitude = flight.altitudeFeet ? `${Math.round(flight.altitudeFeet)}ft` : '';
    
    context.fillText(callsign, canvas.width / 2, 25);
    context.fillText(altitude, canvas.width / 2, 45);
    
    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.scale.set(0.5, 0.125, 1);
    sprite.position.set(0, 0.2, 0);
    
    return sprite;
  }

  /**
   * Update aircraft position
   */
  updateAircraftPosition(aircraftObj, flight) {
    const group = aircraftObj.group;
    
    // Convert lat/lng to world coordinates
    const worldPos = this.latLngToWorld(flight.latitude, flight.longitude, flight.altitudeFeet);
    
    // Store previous position for animation
    const previousPos = group.userData.lastPosition;
    
    // Update position
    group.position.copy(worldPos);
    
    // Update rotation based on movement
    if (previousPos && flight.trueTrack !== null) {
      this.flightAnimation.updateAircraftRotation(
        aircraftObj.model,
        { latitude: flight.latitude, longitude: flight.longitude, altitude: flight.altitudeFeet },
        previousPos,
        flight.trueTrack
      );
    }
    
    // Update label
    this.updateAircraftLabel(aircraftObj.label, flight);
    
    // Store current position
    group.userData.lastPosition = {
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitude: flight.altitudeFeet
    };
    
    aircraftObj.lastUpdate = Date.now();
  }

  /**
   * Update aircraft label
   */
  updateAircraftLabel(label, flight) {
    // Update label visibility based on zoom level
    const zoom = this.mapService.getZoom();
    label.visible = zoom > 8;
    
    if (!label.visible) return;
    
    // Update label content if needed
    const canvas = label.material.map.image;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw updated label
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    context.textAlign = 'center';
    
    const callsign = flight.callsign || flight.icao24;
    const altitude = flight.altitudeFeet ? `${Math.round(flight.altitudeFeet)}ft` : '';
    const speed = flight.speedKnots ? `${Math.round(flight.speedKnots)}kts` : '';
    
    context.fillText(callsign, canvas.width / 2, 20);
    context.fillText(altitude, canvas.width / 2, 35);
    context.fillText(speed, canvas.width / 2, 50);
    
    label.material.map.needsUpdate = true;
  }

  /**
   * Convert latitude/longitude to world coordinates
   */
  latLngToWorld(lat, lng, altitude = 0) {
    // Use Mapbox's projection
    const point = this.mapService.project([lng, lat]);
    
    // Convert altitude from feet to meters and scale
    const altitudeMeters = (altitude || 0) * 0.3048;
    const scaledAltitude = altitudeMeters * 0.001; // Scale down for visualization
    
    return new THREE.Vector3(point.x, point.y, scaledAltitude);
  }

  /**
   * Update flight trail for aircraft
   */
  updateFlightTrail(flight) {
    if (!this.flightTrails.has(flight.icao24)) {
      this.flightTrails.set(flight.icao24, []);
    }
    
    const trail = this.flightTrails.get(flight.icao24);
    
    // Add current position to trail
    trail.push({
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitude: flight.altitudeFeet,
      timestamp: Date.now()
    });
    
    // Limit trail length
    if (trail.length > this.trailLength) {
      trail.shift();
    }
  }

  /**
   * Update all flight trails visualization
   */
  updateFlightTrails() {
    // This would create line geometries for flight trails
    // Implementation depends on specific requirements
  }

  /**
   * Remove aircraft from scene
   */
  removeAircraft(icao24) {
    const aircraftObj = this.aircraftObjects.get(icao24);
    if (aircraftObj) {
      this.scene.remove(aircraftObj.group);
      
      // Dispose of geometries and materials
      aircraftObj.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      this.aircraftObjects.delete(icao24);
    }
    
    // Remove flight trail
    this.flightTrails.delete(icao24);
  }

  /**
   * Select aircraft for detailed view
   */
  selectAircraft(icao24) {
    // Deselect previous aircraft
    if (this.selectedAircraft) {
      const prevObj = this.aircraftObjects.get(this.selectedAircraft);
      if (prevObj) {
        prevObj.model.material.emissive.setHex(0x000000);
      }
    }
    
    // Select new aircraft
    this.selectedAircraft = icao24;
    const aircraftObj = this.aircraftObjects.get(icao24);
    
    if (aircraftObj) {
      aircraftObj.model.material.emissive.setHex(0x444444);
      
      this.emit('aircraftSelected', {
        icao24: icao24,
        userData: aircraftObj.group.userData
      });
    }
  }

  /**
   * Get renderer statistics
   */
  getStats() {
    return {
      aircraftCount: this.aircraftObjects.size,
      trailCount: this.flightTrails.size,
      selectedAircraft: this.selectedAircraft,
      modelCacheStats: this.modelLoader.getCacheStats(),
      animationStats: this.flightAnimation.getStats()
    };
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
    // Stop animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Clear all aircraft
    for (const icao24 of this.aircraftObjects.keys()) {
      this.removeAircraft(icao24);
    }
    
    // Clear caches
    this.modelLoader.clearCache();
    this.flightAnimation.clearAllAnimations();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    this.isInitialized = false;
  }
}

