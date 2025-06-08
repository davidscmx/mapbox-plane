/**
 * Aircraft type definitions and categorization
 */

export const AIRCRAFT_CATEGORIES = {
  LIGHT: 'light',
  MEDIUM: 'medium', 
  HEAVY: 'heavy',
  SUPER: 'super',
  MILITARY: 'military',
  HELICOPTER: 'helicopter',
  GLIDER: 'glider',
  UNKNOWN: 'unknown'
};

export const AIRCRAFT_TYPES = {
  // Airbus
  'A319': { name: 'Airbus A319', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Airbus' },
  'A320': { name: 'Airbus A320', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Airbus' },
  'A321': { name: 'Airbus A321', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Airbus' },
  'A330': { name: 'Airbus A330', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Airbus' },
  'A340': { name: 'Airbus A340', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Airbus' },
  'A350': { name: 'Airbus A350', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Airbus' },
  'A380': { name: 'Airbus A380', category: AIRCRAFT_CATEGORIES.SUPER, manufacturer: 'Airbus' },
  
  // Boeing
  'B737': { name: 'Boeing 737', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Boeing' },
  'B738': { name: 'Boeing 737-800', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Boeing' },
  'B739': { name: 'Boeing 737-900', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Boeing' },
  'B747': { name: 'Boeing 747', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Boeing' },
  'B757': { name: 'Boeing 757', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Boeing' },
  'B767': { name: 'Boeing 767', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Boeing' },
  'B777': { name: 'Boeing 777', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Boeing' },
  'B787': { name: 'Boeing 787', category: AIRCRAFT_CATEGORIES.HEAVY, manufacturer: 'Boeing' },
  
  // Embraer
  'E170': { name: 'Embraer E170', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Embraer' },
  'E175': { name: 'Embraer E175', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Embraer' },
  'E190': { name: 'Embraer E190', category: AIRCRAFT_CATEGORIES.MEDIUM, manufacturer: 'Embraer' },
  
  // Bombardier
  'CRJ2': { name: 'Bombardier CRJ200', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Bombardier' },
  'CRJ7': { name: 'Bombardier CRJ700', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Bombardier' },
  'CRJ9': { name: 'Bombardier CRJ900', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Bombardier' },
  
  // General Aviation
  'C172': { name: 'Cessna 172', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Cessna' },
  'C208': { name: 'Cessna 208', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Cessna' },
  'BE20': { name: 'Beechcraft King Air', category: AIRCRAFT_CATEGORIES.LIGHT, manufacturer: 'Beechcraft' },
  
  // Military
  'F16': { name: 'F-16 Fighting Falcon', category: AIRCRAFT_CATEGORIES.MILITARY, manufacturer: 'Lockheed Martin' },
  'F22': { name: 'F-22 Raptor', category: AIRCRAFT_CATEGORIES.MILITARY, manufacturer: 'Lockheed Martin' },
  'C130': { name: 'C-130 Hercules', category: AIRCRAFT_CATEGORIES.MILITARY, manufacturer: 'Lockheed Martin' },
};

/**
 * Get aircraft information by type code
 */
export function getAircraftInfo(typeCode) {
  if (!typeCode) return null;
  
  const normalizedType = typeCode.toUpperCase();
  return AIRCRAFT_TYPES[normalizedType] || {
    name: typeCode,
    category: AIRCRAFT_CATEGORIES.UNKNOWN,
    manufacturer: 'Unknown'
  };
}

/**
 * Get aircraft category by type code
 */
export function getAircraftCategory(typeCode) {
  const info = getAircraftInfo(typeCode);
  return info ? info.category : AIRCRAFT_CATEGORIES.UNKNOWN;
}

/**
 * Get model scale factor based on aircraft category
 */
export function getModelScale(category) {
  switch (category) {
    case AIRCRAFT_CATEGORIES.LIGHT:
      return 0.8;
    case AIRCRAFT_CATEGORIES.MEDIUM:
      return 1.0;
    case AIRCRAFT_CATEGORIES.HEAVY:
      return 1.3;
    case AIRCRAFT_CATEGORIES.SUPER:
      return 1.6;
    case AIRCRAFT_CATEGORIES.MILITARY:
      return 0.9;
    case AIRCRAFT_CATEGORIES.HELICOPTER:
      return 0.7;
    case AIRCRAFT_CATEGORIES.GLIDER:
      return 0.6;
    default:
      return 1.0;
  }
}

/**
 * Get color scheme based on aircraft category
 */
export function getAircraftColor(category) {
  switch (category) {
    case AIRCRAFT_CATEGORIES.LIGHT:
      return '#4CAF50'; // Green
    case AIRCRAFT_CATEGORIES.MEDIUM:
      return '#2196F3'; // Blue
    case AIRCRAFT_CATEGORIES.HEAVY:
      return '#FF9800'; // Orange
    case AIRCRAFT_CATEGORIES.SUPER:
      return '#9C27B0'; // Purple
    case AIRCRAFT_CATEGORIES.MILITARY:
      return '#F44336'; // Red
    case AIRCRAFT_CATEGORIES.HELICOPTER:
      return '#00BCD4'; // Cyan
    case AIRCRAFT_CATEGORIES.GLIDER:
      return '#8BC34A'; // Light Green
    default:
      return '#757575'; // Gray
  }
}

/**
 * Determine aircraft type from various data sources
 */
export function determineAircraftType(flight) {
  // Try aircraft type field first
  if (flight.aircraftType) {
    return flight.aircraftType;
  }
  
  // Try to extract from callsign (airline codes)
  if (flight.callsign) {
    const callsign = flight.callsign.trim();
    
    // Common airline patterns that might indicate aircraft type
    const airlinePatterns = {
      'UAL': 'B737', // United Airlines - commonly uses 737s
      'AAL': 'B737', // American Airlines
      'DAL': 'B737', // Delta Airlines
      'SWA': 'B737', // Southwest Airlines
      'JBU': 'A320', // JetBlue - commonly uses A320 family
      'VRD': 'A320', // Virgin America
    };
    
    const airlineCode = callsign.substring(0, 3);
    if (airlinePatterns[airlineCode]) {
      return airlinePatterns[airlineCode];
    }
  }
  
  // Default based on altitude and speed
  if (flight.altitudeFeet && flight.speedKnots) {
    if (flight.altitudeFeet > 35000 && flight.speedKnots > 400) {
      return 'B737'; // Likely commercial airliner
    } else if (flight.altitudeFeet < 10000 && flight.speedKnots < 200) {
      return 'C172'; // Likely general aviation
    }
  }
  
  return null; // Unknown
}

