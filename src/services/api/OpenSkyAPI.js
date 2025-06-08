/**
 * OpenSky Network API Service
 * Provides real-time flight data from ADS-B transponders
 * Documentation: https://opensky-network.org/apidoc/
 */
export class OpenSkyAPI {
  constructor() {
    // Use backend proxy to avoid CORS issues
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/opensky' 
      : 'http://localhost:3001/api/opensky';
    
    this.lastRequestTime = 0;
    this.minRequestInterval = 10000; // 10 seconds minimum between requests
    this.maxRetries = 3;
  }

  /**
   * Get authentication headers if credentials are provided
   */
  getAuthHeaders() {
    if (this.username && this.password) {
      const credentials = btoa(`${this.username}:${this.password}`);
      return {
        'Authorization': `Basic ${credentials}`
      };
    }
    return {};
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
   * Make HTTP request to OpenSky API via backend proxy
   */
  async makeRequest(endpoint, params = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      throw new Error(`Rate limit: Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request`);
    }

    try {
      // Build URL with query parameters
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}/${endpoint}${queryString ? '?' + queryString : ''}`;
      
      console.log(`🛩️ Making OpenSky API request: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.lastRequestTime = now;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenSky API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('OpenSky API request failed:', error);
      throw error;
    }
  }

  /**
   * Get all current flights
   * @param {Object} bounds - Optional bounding box {north, south, east, west}
   * @returns {Promise<Array>} Array of flight state vectors
   */
  async getAllFlights(bounds = null) {
    const params = {};
    
    if (bounds) {
      params.lamin = bounds.south;
      params.lamax = bounds.north;
      params.lomin = bounds.west;
      params.lomax = bounds.east;
    }

    const data = await this.makeRequest('/states/all', params);
    
    if (!data || !data.states) {
      return [];
    }

    return data.states.map(state => this.parseStateVector(state));
  }

  /**
   * Get flights by ICAO24 identifier
   * @param {Array<string>} icao24List - List of ICAO24 identifiers
   * @returns {Promise<Array>} Array of flight state vectors
   */
  async getFlightsByIcao(icao24List) {
    const icao24String = icao24List.join(',');
    const data = await this.makeRequest('/states/all', { icao24: icao24String });
    
    if (!data || !data.states) {
      return [];
    }

    return data.states.map(state => this.parseStateVector(state));
  }

  /**
   * Get flight track for a specific aircraft
   * @param {string} icao24 - ICAO24 identifier
   * @param {number} time - Unix timestamp (optional)
   * @returns {Promise<Object>} Flight track data
   */
  async getFlightTrack(icao24, time = null) {
    const params = { icao24 };
    if (time) {
      params.time = time;
    }

    const data = await this.makeRequest('/tracks/all', params);
    return data;
  }

  /**
   * Parse OpenSky state vector into standardized format
   * State vector format: [icao24, callsign, origin_country, time_position, last_contact, 
   *                      longitude, latitude, baro_altitude, on_ground, velocity, 
   *                      true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
   */
  parseStateVector(state) {
    return {
      // Identifiers
      icao24: state[0],
      callsign: state[1] ? state[1].trim() : null,
      originCountry: state[2],
      
      // Position data
      longitude: state[5],
      latitude: state[6],
      baroAltitude: state[7], // meters
      geoAltitude: state[13], // meters
      onGround: state[8],
      
      // Movement data
      velocity: state[9], // m/s
      trueTrack: state[10], // degrees
      verticalRate: state[11], // m/s
      
      // Timestamps
      timePosition: state[3],
      lastContact: state[4],
      
      // Additional data
      squawk: state[14],
      spi: state[15],
      positionSource: state[16],
      
      // Computed fields
      altitudeFeet: state[7] ? Math.round(state[7] * 3.28084) : null,
      speedKnots: state[9] ? Math.round(state[9] * 1.94384) : null,
      heading: state[10],
      
      // Data source
      source: 'opensky',
      timestamp: Date.now()
    };
  }

  /**
   * Get flights within a radius of a point
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude  
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} Array of flights
   */
  async getFlightsInRadius(lat, lon, radiusKm) {
    // Convert radius to approximate bounding box
    const latDelta = radiusKm / 111; // Rough conversion: 1 degree ≈ 111 km
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    const bounds = {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lon + lonDelta,
      west: lon - lonDelta
    };
    
    const flights = await this.getAllFlights(bounds);
    
    // Filter by actual distance
    return flights.filter(flight => {
      if (!flight.latitude || !flight.longitude) return false;
      
      const distance = this.calculateDistance(
        lat, lon, 
        flight.latitude, flight.longitude
      );
      
      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Test API connectivity and authentication
   */
  async getStatus() {
    try {
      // Use a simpler endpoint that doesn't require specific parameters
      const response = await this.makeRequest('states/all', { 
        lamin: 45, 
        lomin: 5, 
        lamax: 46, 
        lomax: 6 
      });
      
      return {
        status: 'connected',
        authenticated: true, // Backend handles auth
        rateLimit: 'Backend managed',
        lastUpdate: new Date().toISOString(),
        flightCount: response.states ? response.states.length : 0
      };
    } catch (error) {
      console.warn('OpenSky API status check failed:', error.message);
      return {
        status: 'error',
        authenticated: false,
        error: error.message,
        lastUpdate: new Date().toISOString()
      };
    }
  }
}
