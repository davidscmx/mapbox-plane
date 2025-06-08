/**
 * Mock Flight API Service
 * Provides simulated flight data for development and testing
 * Used as fallback when real APIs are unavailable
 */
export class MockFlightAPI {
  constructor() {
    this.baseUrl = 'mock://flights';
    this.flightCount = 50; // Number of mock flights to generate
    this.updateInterval = 5000; // Update every 5 seconds
    this.flights = new Map();
    this.lastUpdate = 0;
    
    this.initializeMockFlights();
  }

  /**
   * Initialize mock flight data
   */
  initializeMockFlights() {
    const airlines = ['UAL', 'DAL', 'AAL', 'SWA', 'JBU', 'BAW', 'AFR', 'DLH', 'KLM', 'ANA'];
    const aircraftTypes = ['B738', 'A320', 'B777', 'A350', 'B787', 'A330', 'B747', 'A380'];
    
    for (let i = 0; i < this.flightCount; i++) {
      const icao24 = this.generateICAO24();
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNumber = Math.floor(Math.random() * 9999) + 1;
      
      const flight = {
        icao24,
        callsign: `${airline}${flightNumber}`,
        registration: this.generateRegistration(),
        
        // Random position around the world
        longitude: (Math.random() - 0.5) * 360,
        latitude: (Math.random() - 0.5) * 180,
        baroAltitude: Math.random() * 12000 + 1000, // 1000-13000m
        geoAltitude: null,
        onGround: Math.random() < 0.1, // 10% on ground
        
        // Movement data
        velocity: Math.random() * 250 + 100, // 100-350 m/s
        trueTrack: Math.random() * 360,
        verticalRate: (Math.random() - 0.5) * 10, // -5 to +5 m/s
        
        // Timestamps
        timePosition: Date.now(),
        lastContact: Date.now(),
        
        // Aircraft info
        aircraftType: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)],
        category: this.getAircraftCategory(aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)]),
        
        // Additional data
        squawk: this.generateSquawk(),
        emergency: false,
        
        // Computed fields
        altitudeFeet: Math.floor((Math.random() * 12000 + 1000) * 3.28084),
        speedKnots: Math.floor((Math.random() * 250 + 100) * 1.94384),
        heading: Math.random() * 360,
        
        // Movement vectors for animation
        deltaLat: (Math.random() - 0.5) * 0.01,
        deltaLon: (Math.random() - 0.5) * 0.01,
        deltaAlt: (Math.random() - 0.5) * 100,
        
        // Data source
        source: 'mock',
        timestamp: Date.now()
      };
      
      this.flights.set(icao24, flight);
    }
  }

  /**
   * Generate random ICAO24 identifier
   */
  generateICAO24() {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random aircraft registration
   */
  generateRegistration() {
    const prefixes = ['N', 'G-', 'D-', 'F-', 'JA', 'VH-', 'C-'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return prefix + suffix;
  }

  /**
   * Generate random squawk code
   */
  generateSquawk() {
    return Math.floor(Math.random() * 7777).toString().padStart(4, '0');
  }

  /**
   * Get aircraft category based on type
   */
  getAircraftCategory(type) {
    const categories = {
      'B747': 'heavy',
      'A380': 'super',
      'B777': 'heavy',
      'A350': 'heavy',
      'B787': 'heavy',
      'A330': 'heavy',
      'B738': 'medium',
      'A320': 'medium'
    };
    return categories[type] || 'medium';
  }

  /**
   * Update flight positions (simulate movement)
   */
  updateFlightPositions() {
    const now = Date.now();
    
    this.flights.forEach((flight, icao24) => {
      // Update position based on movement vectors
      flight.latitude += flight.deltaLat;
      flight.longitude += flight.deltaLon;
      flight.baroAltitude += flight.deltaAlt;
      
      // Keep within bounds
      flight.latitude = Math.max(-85, Math.min(85, flight.latitude));
      flight.longitude = ((flight.longitude + 180) % 360) - 180;
      flight.baroAltitude = Math.max(0, Math.min(15000, flight.baroAltitude));
      
      // Update computed fields
      flight.altitudeFeet = Math.floor(flight.baroAltitude * 3.28084);
      flight.heading = flight.trueTrack;
      
      // Occasionally change direction
      if (Math.random() < 0.1) {
        flight.deltaLat = (Math.random() - 0.5) * 0.01;
        flight.deltaLon = (Math.random() - 0.5) * 0.01;
        flight.trueTrack = Math.random() * 360;
      }
      
      // Update timestamps
      flight.timePosition = now;
      flight.lastContact = now;
      flight.timestamp = now;
    });
    
    this.lastUpdate = now;
  }

  /**
   * Get all flights
   */
  async getAllFlights() {
    this.updateFlightPositions();
    return Array.from(this.flights.values());
  }

  /**
   * Get flights by geographic location
   */
  async getFlightsByLocation(lat, lon, radius = 250) {
    this.updateFlightPositions();
    
    const flights = Array.from(this.flights.values());
    
    // Filter flights within radius (simplified distance calculation)
    return flights.filter(flight => {
      const distance = this.calculateDistance(lat, lon, flight.latitude, flight.longitude);
      return distance <= radius;
    });
  }

  /**
   * Calculate distance between two points (simplified)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Search flights by callsign
   */
  async searchFlights(query) {
    this.updateFlightPositions();
    
    const flights = Array.from(this.flights.values());
    const searchTerm = query.toLowerCase();
    
    return flights.filter(flight => 
      flight.callsign?.toLowerCase().includes(searchTerm) ||
      flight.registration?.toLowerCase().includes(searchTerm) ||
      flight.icao24?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get flight by ICAO24
   */
  async getFlightByICAO24(icao24) {
    this.updateFlightPositions();
    return this.flights.get(icao24.toUpperCase()) || null;
  }

  /**
   * Get API status
   */
  async getStatus() {
    return {
      status: 'connected',
      authenticated: false,
      rateLimit: 'unlimited',
      lastUpdate: new Date(this.lastUpdate).toISOString(),
      flightCount: this.flights.size,
      type: 'mock'
    };
  }

  /**
   * Make request (mock implementation)
   */
  async makeRequest(endpoint, params = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    
    // Return mock data based on endpoint
    if (endpoint.includes('states/all')) {
      return { states: await this.getAllFlights() };
    }
    
    return { aircraft: await this.getAllFlights() };
  }
}

