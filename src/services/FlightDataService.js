import { OpenSkyAPI } from './api/OpenSkyAPI.js';
import { AirplanesLiveAPI } from './api/AirplanesLiveAPI.js';
import { MockFlightAPI } from './api/MockFlightAPI.js';

/**
 * Flight Data Service
 * Aggregates flight data from multiple sources
 */
export class FlightDataService {
  constructor() {
    this.apis = [];
    this.flights = new Map();
    this.cache = new Map(); // Add missing cache property
    this.lastUpdate = 0;
    this.updateInterval = 10000; // 10 seconds
    this.isUpdating = false;
    this.listeners = new Set();
    this.apiStatus = {}; // Add missing apiStatus property
    
    // Initialize APIs
    this.openSky = new OpenSkyAPI();
    this.airplanesLive = new AirplanesLiveAPI();
    this.mockAPI = new MockFlightAPI(); // Fallback API
    
    this.apis = [this.openSky, this.airplanesLive, this.mockAPI];
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
   * Fetch flight data from all available sources
   */
  async fetchFlightData() {
    if (this.isUpdating) {
      console.log('⏳ Update already in progress, skipping...');
      return this.getFlights();
    }

    this.isUpdating = true;
    const startTime = Date.now();
    console.log('🔄 Fetching flight data from all sources...');

    try {
      const results = await Promise.allSettled([
        this.fetchFromWorkingAPIs()
      ]);

      // Process results
      const allFlights = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allFlights.push(...result.value);
        }
      });

      // Update flight cache
      this.updateFlightCache(allFlights);
      
      const duration = Date.now() - startTime;
      const flightCount = this.flights.size;
      
      console.log(`✅ Flight data updated: ${flightCount} flights (${duration}ms)`);
      
      // Emit update event
      this.emit('flightsUpdated', {
        flights: this.getFlights(),
        count: flightCount,
        duration,
        timestamp: Date.now()
      });

      return this.getFlights();
    } catch (error) {
      console.error('❌ Error fetching flight data:', error);
      return this.getFlights(); // Return cached data
    } finally {
      this.isUpdating = false;
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Fetch from working APIs only
   */
  async fetchFromWorkingAPIs() {
    const workingAPIs = this.apis.filter(api => 
      !api.lastError || (Date.now() - api.lastErrorTime) > 60000 // Retry after 1 minute
    );

    if (workingAPIs.length === 0) {
      console.log('📡 No working APIs, using mock data...');
      return await this.mockAPI.getAllFlights();
    }

    const promises = workingAPIs.map(async (api) => {
      try {
        if (api === this.openSky) {
          return await api.getAllFlights();
        } else if (api === this.airplanesLive) {
          // Get flights around major cities
          const locations = [
            { lat: 40.7128, lon: -74.0060, name: 'New York' },
            { lat: 51.5074, lon: -0.1278, name: 'London' },
            { lat: 35.6762, lon: 139.6503, name: 'Tokyo' }
          ];
          
          const allFlights = [];
          for (const location of locations) {
            const flights = await api.getFlightsByLocation(location.lat, location.lon, 200);
            allFlights.push(...flights);
          }
          return allFlights;
        } else if (api === this.mockAPI) {
          return await api.getAllFlights();
        }
        return [];
      } catch (error) {
        console.warn(`API ${api.constructor.name} failed:`, error.message);
        api.lastError = error;
        api.lastErrorTime = Date.now();
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    const allFlights = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allFlights.push(...result.value);
        console.log(`✅ ${workingAPIs[index].constructor.name}: ${result.value.length} flights`);
      } else {
        console.warn(`❌ ${workingAPIs[index].constructor.name}: failed`);
      }
    });

    return allFlights;
  }

  /**
   * Get all flights from cache and APIs
   */
  async getAllFlights() {
    // Return cached flights if available and recent
    if (this.flights.size > 0 && (Date.now() - this.lastUpdate) < 30000) {
      return Array.from(this.flights.values());
    }

    // If no cached data or data is stale, fetch new data
    try {
      return await this.fetchFlightData();
    } catch (error) {
      console.error('Error in getAllFlights:', error);
      // Return any cached data we have, even if stale
      return this.getCachedFlights();
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
   * Update flight cache with new data
   */
  updateFlightCache(flights) {
    if (!Array.isArray(flights)) {
      console.warn('Invalid flights data for cache update');
      return;
    }

    // Clear old cache
    this.flights.clear();
    this.cache.clear();

    // Add new flights to cache
    flights.forEach(flight => {
      if (flight.icao24) {
        this.flights.set(flight.icao24, flight);
        this.cache.set(flight.icao24, flight);
      }
    });

    console.log(`📦 Cache updated with ${flights.length} flights`);
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
   * Get all cached flights
   */
  getCachedFlights() {
    if (!this.cache || this.cache.size === 0) {
      return [];
    }
    
    const flights = [];
    for (const [icao24, flight] of this.cache.entries()) {
      // Check if flight data is still fresh (within 5 minutes)
      if (Date.now() - flight.timestamp < 300000) {
        flights.push(flight);
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
    if (!this.listeners.has(event)) {
      this.listeners.add(event);
    }
    this.listeners.forEach(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.forEach(callback => {
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
    this.listeners.clear();
  }
}
