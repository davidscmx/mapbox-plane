import { OpenSkyAPI } from './api/OpenSkyAPI.js';
import { AirplanesLiveAPI } from './api/AirplanesLiveAPI.js';

/**
 * Unified Flight Data Service
 * Aggregates data from multiple flight tracking APIs
 */
export class FlightDataService {
  constructor() {
    this.apis = {
      opensky: new OpenSkyAPI(),
      airplanesLive: new AirplanesLiveAPI()
    };
    
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.isUpdating = false;
    this.updateInterval = null;
    this.eventListeners = new Map();
    
    // Statistics
    this.stats = {
      totalFlights: 0,
      activeFlights: 0,
      lastUpdate: null,
      apiStatus: {},
      updateCount: 0
    };
  }

  /**
   * Initialize the service and start automatic updates
   */
  async initialize(updateIntervalMs = 10000) {
    console.log('🛩️ Initializing Flight Data Service...');
    
    // Check API status
    await this.checkApiStatus();
    
    // Start automatic updates
    this.startAutoUpdate(updateIntervalMs);
    
    console.log('✈️ Flight Data Service initialized');
  }

  /**
   * Check status of all APIs
   */
  async checkApiStatus() {
    const statusChecks = Object.entries(this.apis).map(async ([name, api]) => {
      try {
        const status = await api.getStatus();
        this.stats.apiStatus[name] = status;
        console.log(`📡 ${name} API:`, status.status);
      } catch (error) {
        this.stats.apiStatus[name] = { status: 'error', error: error.message };
        console.warn(`⚠️ ${name} API check failed:`, error.message);
      }
    });
    
    await Promise.allSettled(statusChecks);
  }

  /**
   * Get flights from all available APIs
   */
  async getAllFlights(bounds = null) {
    if (this.isUpdating) {
      console.log('⏳ Update already in progress, returning cached data');
      return this.getCachedFlights();
    }

    this.isUpdating = true;
    const startTime = Date.now();
    
    try {
      console.log('🔄 Fetching flight data from all sources...');
      
      const flightPromises = [];
      
      // OpenSky Network
      if (this.stats.apiStatus.opensky?.status === 'ok') {
        flightPromises.push(
          this.apis.opensky.getAllFlights(bounds)
            .then(flights => ({ source: 'opensky', flights, error: null }))
            .catch(error => ({ source: 'opensky', flights: [], error }))
        );
      }
      
      // Airplanes.live
      if (this.stats.apiStatus.airplanesLive?.status === 'ok') {
        if (bounds) {
          flightPromises.push(
            this.apis.airplanesLive.getFlightsInBounds(bounds)
              .then(flights => ({ source: 'airplanesLive', flights, error: null }))
              .catch(error => ({ source: 'airplanesLive', flights: [], error }))
          );
        } else {
          // Default to New York area if no bounds specified
          flightPromises.push(
            this.apis.airplanesLive.getFlightsByLocation(40.7128, -74.0060, 250)
              .then(flights => ({ source: 'airplanesLive', flights, error: null }))
              .catch(error => ({ source: 'airplanesLive', flights: [], error }))
          );
        }
      }
      
      const results = await Promise.allSettled(flightPromises);
      
      // Combine and deduplicate flights
      const allFlights = [];
      const seenIcao24 = new Set();
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { source, flights, error } = result.value;
          
          if (error) {
            console.warn(`⚠️ ${source} API error:`, error.message);
          } else {
            console.log(`📊 ${source}: ${flights.length} flights`);
            
            flights.forEach(flight => {
              if (flight.icao24 && !seenIcao24.has(flight.icao24)) {
                seenIcao24.add(flight.icao24);
                allFlights.push(flight);
              }
            });
          }
        }
      });
      
      // Filter out invalid flights
      const validFlights = allFlights.filter(flight => 
        flight.latitude !== null && 
        flight.longitude !== null &&
        !isNaN(flight.latitude) && 
        !isNaN(flight.longitude) &&
        Math.abs(flight.latitude) <= 90 &&
        Math.abs(flight.longitude) <= 180
      );
      
      // Update cache
      this.updateCache(validFlights);
      
      // Update statistics
      this.stats.totalFlights = validFlights.length;
      this.stats.activeFlights = validFlights.filter(f => !f.onGround).length;
      this.stats.lastUpdate = new Date();
      this.stats.updateCount++;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Flight data updated: ${validFlights.length} flights (${duration}ms)`);
      
      // Emit update event
      this.emit('flightsUpdated', {
        flights: validFlights,
        stats: this.stats,
        duration
      });
      
      return validFlights;
      
    } catch (error) {
      console.error('❌ Failed to fetch flight data:', error);
      this.emit('error', error);
      return this.getCachedFlights();
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Search for specific flights
   */
  async searchFlights(query) {
    const searchPromises = [];
    
    // Search in Airplanes.live (has better search capabilities)
    if (this.stats.apiStatus.airplanesLive?.status === 'ok') {
      searchPromises.push(
        this.apis.airplanesLive.searchFlights({
          callsign: query.toUpperCase(),
          registration: query.toUpperCase(),
          hex: query.toLowerCase()
        })
      );
    }
    
    try {
      const results = await Promise.allSettled(searchPromises);
      const flights = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          flights.push(...result.value);
        }
      });
      
      // Remove duplicates
      const uniqueFlights = flights.filter((flight, index, self) => 
        index === self.findIndex(f => f.icao24 === flight.icao24)
      );
      
      return uniqueFlights;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Get flight details by ICAO24
   */
  async getFlightDetails(icao24) {
    // First check cache
    const cached = this.cache.get(icao24);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.flight;
    }
    
    // Try to get from APIs
    try {
      // Try Airplanes.live first (usually faster)
      if (this.stats.apiStatus.airplanesLive?.status === 'ok') {
        const flight = await this.apis.airplanesLive.getFlightByHex(icao24);
        if (flight) {
          this.cache.set(icao24, { flight, timestamp: Date.now() });
          return flight;
        }
      }
      
      // Try OpenSky
      if (this.stats.apiStatus.opensky?.status === 'ok') {
        const flights = await this.apis.opensky.getFlightsByIcao([icao24]);
        if (flights.length > 0) {
          const flight = flights[0];
          this.cache.set(icao24, { flight, timestamp: Date.now() });
          return flight;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get flight details for ${icao24}:`, error);
      return null;
    }
  }

  /**
   * Update cache with new flight data
   */
  updateCache(flights) {
    const timestamp = Date.now();
    flights.forEach(flight => {
      this.cache.set(flight.icao24, { flight, timestamp });
    });
    
    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached flights
   */
  getCachedFlights() {
    const flights = [];
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.cacheTimeout) {
        flights.push(value.flight);
      }
    }
    
    return flights;
  }

  /**
   * Start automatic updates
   */
  startAutoUpdate(intervalMs) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.getAllFlights();
    }, intervalMs);
    
    // Initial update
    this.getAllFlights();
  }

  /**
   * Stop automatic updates
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
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
    this.stopAutoUpdate();
    this.cache.clear();
    this.eventListeners.clear();
  }
}

