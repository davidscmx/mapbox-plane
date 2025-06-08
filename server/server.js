import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.178.51:3000'],
  credentials: true
}));

app.use(express.json());

// Rate limiting for API requests
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(ip, apiName) {
  const key = `${ip}-${apiName}`;
  const now = Date.now();
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  const limit = rateLimiter.get(key);
  
  if (now > limit.resetTime) {
    // Reset the counter
    rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  limit.count++;
  return true;
}

// OpenSky Network API proxy
app.get('/api/opensky/*', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!checkRateLimit(clientIp, 'opensky')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making another request.' 
      });
    }

    const apiPath = req.params[0];
    const queryString = req.url.split('?')[1] || '';
    const url = `https://opensky-network.org/api/${apiPath}${queryString ? '?' + queryString : ''}`;
    
    console.log(`🛩️ Proxying OpenSky request: ${url}`);
    
    const headers = {
      'User-Agent': 'MapboxPlaneTracker/1.0'
    };
    
    // Add authentication if available
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      const auth = Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('OpenSky API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch from OpenSky API',
      details: error.message 
    });
  }
});

// ADS-B Exchange API proxy
app.get('/api/adsbx/*', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!checkRateLimit(clientIp, 'adsbx')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making another request.' 
      });
    }

    const apiPath = req.params[0];
    const queryString = req.url.split('?')[1] || '';
    const url = `https://adsbexchange.com/api/${apiPath}${queryString ? '?' + queryString : ''}`;
    
    console.log(`📡 Proxying ADS-B Exchange request: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MapboxPlaneTracker/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`ADS-B Exchange API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('ADS-B Exchange API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch from ADS-B Exchange API',
      details: error.message 
    });
  }
});

// Mock flight data endpoint
app.get('/api/mock/flights', (req, res) => {
  const { lat, lon, radius = 250 } = req.query;
  
  // Generate mock flights
  const flights = [];
  const flightCount = Math.floor(Math.random() * 20) + 10; // 10-30 flights
  
  const airlines = ['UAL', 'DAL', 'AAL', 'SWA', 'JBU', 'BAW', 'AFR', 'DLH', 'KLM', 'ANA'];
  const aircraftTypes = ['B738', 'A320', 'B777', 'A350', 'B787', 'A330', 'B747', 'A380'];
  
  for (let i = 0; i < flightCount; i++) {
    const centerLat = parseFloat(lat) || 40.7128;
    const centerLon = parseFloat(lon) || -74.0060;
    const radiusKm = parseFloat(radius) || 250;
    
    // Generate random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    const deltaLat = (distance / 111) * Math.cos(angle);
    const deltaLon = (distance / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
    
    const icao24 = Math.random().toString(16).substr(2, 6).toUpperCase();
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = Math.floor(Math.random() * 9999) + 1;
    
    flights.push({
      icao24,
      callsign: `${airline}${flightNumber}`,
      origin_country: 'United States',
      time_position: Math.floor(Date.now() / 1000),
      last_contact: Math.floor(Date.now() / 1000),
      longitude: centerLon + deltaLon,
      latitude: centerLat + deltaLat,
      baro_altitude: Math.random() * 12000 + 1000,
      on_ground: Math.random() < 0.1,
      velocity: Math.random() * 250 + 100,
      true_track: Math.random() * 360,
      vertical_rate: (Math.random() - 0.5) * 10,
      sensors: null,
      geo_altitude: null,
      squawk: Math.floor(Math.random() * 7777).toString().padStart(4, '0'),
      spi: false,
      position_source: 0,
      category: Math.floor(Math.random() * 5) + 1
    });
  }
  
  res.json({
    time: Math.floor(Date.now() / 1000),
    states: flights.map(flight => [
      flight.icao24,
      flight.callsign,
      flight.origin_country,
      flight.time_position,
      flight.last_contact,
      flight.longitude,
      flight.latitude,
      flight.baro_altitude,
      flight.on_ground,
      flight.velocity,
      flight.true_track,
      flight.vertical_rate,
      flight.sensors,
      flight.geo_altitude,
      flight.squawk,
      flight.spi,
      flight.position_source,
      flight.category
    ])
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API status endpoint
app.get('/api/status', async (req, res) => {
  const status = {
    opensky: { status: 'unknown', authenticated: false },
    mock: { status: 'ok', authenticated: false }
  };
  
  // Test OpenSky API
  try {
    const url = 'https://opensky-network.org/api/states/all?lamin=45&lomin=5&lamax=46&lomax=6';
    const headers = { 'User-Agent': 'MapboxPlaneTracker/1.0' };
    
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      const auth = Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
      status.opensky.authenticated = true;
    }
    
    const response = await fetch(url, { headers, timeout: 5000 });
    status.opensky.status = response.ok ? 'ok' : 'error';
  } catch (error) {
    status.opensky.status = 'error';
    status.opensky.error = error.message;
  }
  
  res.json(status);
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Flight Tracker Server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🌍 Frontend served at http://localhost:${PORT}`);
});

