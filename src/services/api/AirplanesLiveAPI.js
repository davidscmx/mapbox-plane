/**
 * Airplanes.live API Service
 * Provides real-time flight data from ADS-B receivers
 * Documentation: https://airplanes.live/
 */
export class AirplanesLiveAPI {
  constructor() {
    // Updated to use the correct API endpoint
    this.baseUrl = 'https://api.adsbdb.com/v0';
    this.lastRequestTime = 0;
    this.minRequestInterval = 5000; // 5 seconds minimum between requests
  }

  /**
   * Rate limiting check
   */
  canMakeRequest() {
    const now = Date.now();
    if (now - this.lastRequestTime < this.minRequestInterval) {
      return false;
    }
    return true;
  }

  /**
   * Make API request with error handling
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit: Please wait before making another request');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    try {
      this.lastRequestTime = Date.now();
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MapboxPlane/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Airplanes.live API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Airplanes.live API request failed:', error);
      throw error;
    }
  }

  /**
   * Get flights by geographic location
   */
  async getFlightsByLocation(lat, lon, radius = 250) {
    try {
      // Updated endpoint for the new API
      const endpoint = `/aircraft/json/lat/${lat}/lon/${lon}/dist/${radius}`;
      const data = await this.makeRequest(endpoint);
      
      if (!data || !data.aircraft) {
        return [];
      }

      return data.aircraft.map(flight => this.normalizeFlightData(flight));
    } catch (error) {
      console.error('Error fetching flights by location:', error);
      return [];
    }
  }

  /**
   * Get flight by hex identifier
   * @param {string} hex - Aircraft hex identifier
   * @returns {Promise<Object|null>} Flight data or null
   */
  async getFlightByHex(hex) {
    const endpoint = `/hex/${hex}`;
    const data = await this.makeRequest(endpoint);
    
    if (!data || !data.ac || data.ac.length === 0) {
      return null;
    }

    return this.parseAircraft(data.ac[0]);
  }

  /**
   * Get flights by callsign
   * @param {string} callsign - Flight callsign
   * @returns {Promise<Array>} Array of flights
   */
  async getFlightsByCallsign(callsign) {
    const endpoint = `/callsign/${callsign}`;
    const data = await this.makeRequest(endpoint);
    
    if (!data || !data.ac) {
      return [];
    }

    return data.ac.map(aircraft => this.parseAircraft(aircraft));
  }

  /**
   * Get flights by registration
   * @param {string} registration - Aircraft registration
   * @returns {Promise<Array>} Array of flights
   */
  async getFlightsByRegistration(registration) {
    const endpoint = `/reg/${registration}`;
    const data = await this.makeRequest(endpoint);
    
    if (!data || !data.ac) {
      return [];
    }

    return data.ac.map(aircraft => this.parseAircraft(aircraft));
  }

  /**
   * Get flights by aircraft type
   * @param {string} type - Aircraft type (e.g., 'B738', 'A320')
   * @returns {Promise<Array>} Array of flights
   */
  async getFlightsByType(type) {
    const endpoint = `/type/${type}`;
    const data = await this.makeRequest(endpoint);
    
    if (!data || !data.ac) {
      return [];
    }

    return data.ac.map(aircraft => this.parseAircraft(aircraft));
  }

  /**
   * Parse aircraft data into standardized format
   */
  parseAircraft(aircraft) {
    return {
      // Identifiers
      icao24: aircraft.hex,
      callsign: aircraft.flight ? aircraft.flight.trim() : null,
      registration: aircraft.r,
      
      // Position data
      longitude: aircraft.lon,
      latitude: aircraft.lat,
      baroAltitude: aircraft.alt_baro ? aircraft.alt_baro * 0.3048 : null, // Convert feet to meters
      geoAltitude: aircraft.alt_geom ? aircraft.alt_geom * 0.3048 : null,
      onGround: aircraft.alt_baro === 'ground',
      
      // Movement data
      velocity: aircraft.gs ? aircraft.gs * 0.514444 : null, // Convert knots to m/s
      trueTrack: aircraft.track,
      verticalRate: aircraft.baro_rate ? aircraft.baro_rate * 0.00508 : null, // Convert ft/min to m/s
      
      // Timestamps
      timePosition: aircraft.seen_pos ? Date.now() - (aircraft.seen_pos * 1000) : null,
      lastContact: aircraft.seen ? Date.now() - (aircraft.seen * 1000) : null,
      
      // Aircraft info
      aircraftType: aircraft.t,
      category: aircraft.category,
      
      // Additional data
      squawk: aircraft.squawk,
      emergency: aircraft.emergency,
      
      // Computed fields
      altitudeFeet: aircraft.alt_baro,
      speedKnots: aircraft.gs,
      heading: aircraft.track,
      
      // Data source
      source: 'airplanes.live',
      timestamp: Date.now(),
      
      // Raw data for debugging
      raw: aircraft
    };
  }

  /**
   * Get flights within a bounding box
   * @param {Object} bounds - {north, south, east, west}
   * @returns {Promise<Array>} Array of flights
   */
  async getFlightsInBounds(bounds) {
    // Calculate center point and distance
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;
    
    // Calculate approximate distance to cover the bounding box
    const latDiff = bounds.north - bounds.south;
    const lonDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lonDiff);
    const distanceNM = Math.ceil(maxDiff * 60); // Convert degrees to nautical miles (rough)
    
    return this.getFlightsByLocation(centerLat, centerLon, Math.min(distanceNM, 250));
  }

  /**
   * Search flights with multiple criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of flights
   */
  async searchFlights(criteria) {
    const results = [];
    
    try {
      if (criteria.callsign) {
        const flights = await this.getFlightsByCallsign(criteria.callsign);
        results.push(...flights);
      }
      
      if (criteria.registration) {
        const flights = await this.getFlightsByRegistration(criteria.registration);
        results.push(...flights);
      }
      
      if (criteria.aircraftType) {
        const flights = await this.getFlightsByType(criteria.aircraftType);
        results.push(...flights);
      }
      
      if (criteria.hex) {
        const flight = await this.getFlightByHex(criteria.hex);
        if (flight) results.push(flight);
      }
      
      // Remove duplicates based on icao24
      const uniqueFlights = results.filter((flight, index, self) => 
        index === self.findIndex(f => f.icao24 === flight.icao24)
      );
      
      return uniqueFlights;
    } catch (error) {
      console.error('Flight search failed:', error);
      return [];
    }
  }

  /**
   * Check API status
   */
  async getStatus() {
    try {
      // Test with a small area around London
      const data = await this.getFlightsByLocation(51.5074, -0.1278, 50);
      return {
        status: 'connected',
        authenticated: false, // This API doesn't require authentication
        rateLimit: 'unlimited',
        lastUpdate: new Date().toISOString(),
        testFlights: data.length
      };
    } catch (error) {
      console.warn('Airplanes.live API status check failed:', error.message);
      return {
        status: 'error',
        authenticated: false,
        error: error.message,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Normalize flight data
   */
  normalizeFlightData(flight) {
    return {
      icao24: flight.hex,
      callsign: flight.flight ? flight.flight.trim() : null,
      registration: flight.r,
      
      // Position data
      longitude: flight.lon,
      latitude: flight.lat,
      baroAltitude: flight.alt_baro ? flight.alt_baro * 0.3048 : null, // Convert feet to meters
      geoAltitude: flight.alt_geom ? flight.alt_geom * 0.3048 : null,
      onGround: flight.alt_baro === 'ground',
      
      // Movement data
      velocity: flight.gs ? flight.gs * 0.514444 : null, // Convert knots to m/s
      trueTrack: flight.track,
      verticalRate: flight.baro_rate ? flight.baro_rate * 0.00508 : null, // Convert ft/min to m/s
      
      // Timestamps
      timePosition: flight.seen_pos ? Date.now() - (flight.seen_pos * 1000) : null,
      lastContact: flight.seen ? Date.now() - (flight.seen * 1000) : null,
      
      // Aircraft info
      aircraftType: flight.t,
      category: flight.category,
      
      // Additional data
      squawk: flight.squawk,
      emergency: flight.emergency,
      
      // Computed fields
      altitudeFeet: flight.alt_baro,
      speedKnots: flight.gs,
      heading: flight.track,
      
      // Data source
      source: 'airplanes.live',
      timestamp: Date.now(),
      
      // Raw data for debugging
      raw: flight
    };
  }
}
