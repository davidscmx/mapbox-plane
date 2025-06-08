import './styles/main.css';
import { MapService } from './services/MapService.js';
import { FlightDataService } from './services/FlightDataService.js';
import { FlightRenderer } from './services/FlightRenderer.js';
import { FlightPanel } from './components/UI/FlightPanel.js';
import { SearchBar } from './components/UI/SearchBar.js';
import { Controls } from './components/UI/Controls.js';

/**
 * Main Application Class
 * Orchestrates all services and components
 */
class FlightSimulatorApp {
  constructor() {
    this.mapService = null;
    this.flightDataService = null;
    this.flightRenderer = null;
    
    // UI Components
    this.flightPanel = null;
    this.searchBar = null;
    this.controls = null;
    
    this.isInitialized = false;
    this.currentFlights = [];
    
    // Bind methods
    this.handleFlightUpdate = this.handleFlightUpdate.bind(this);
    this.handleFlightSearch = this.handleFlightSearch.bind(this);
    this.handleFlightSelection = this.handleFlightSelection.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Initializing Flight Simulator...');
      
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize services
      await this.initializeServices();
      
      // Initialize UI components
      this.initializeUI();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start the application
      await this.start();
      
      this.isInitialized = true;
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      console.log('✅ Flight Simulator initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize Flight Simulator:', error);
      this.showError('Failed to initialize the application. Please refresh the page.');
    }
  }

  /**
   * Initialize core services
   */
  async initializeServices() {
    // Initialize Map Service
    this.mapService = new MapService();
    await this.mapService.initialize('map');
    
    // Initialize Flight Data Service
    this.flightDataService = new FlightDataService();
    await this.flightDataService.initialize();
    
    // Initialize Flight Renderer
    this.flightRenderer = new FlightRenderer(this.mapService);
    await this.flightRenderer.initialize();
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    const uiContainer = document.getElementById('ui-container');
    
    // Flight Panel
    this.flightPanel = new FlightPanel(uiContainer);
    
    // Search Bar
    this.searchBar = new SearchBar(uiContainer);
    
    // Controls
    this.controls = new Controls(uiContainer);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Flight Data Service events
    this.flightDataService.on('flightsUpdated', this.handleFlightUpdate);
    this.flightDataService.on('error', (error) => {
      console.error('Flight data error:', error);
      this.controls.setConnectionStatus(false);
    });

    // Flight Panel events
    this.flightPanel.on('flightSelected', this.handleFlightSelection);
    this.flightPanel.on('refresh', () => {
      this.refreshFlightData();
    });

    // Search Bar events
    this.searchBar.on('search', this.handleFlightSearch);
    this.searchBar.on('resultSelected', this.handleFlightSelection);

    // Controls events
    this.controls.on('autoUpdateChanged', (enabled) => {
      if (enabled) {
        this.flightDataService.startAutoUpdate();
      } else {
        this.flightDataService.stopAutoUpdate();
      }
    });

    this.controls.on('mapStyleChanged', (style) => {
      this.mapService.setStyle(style);
    });

    this.controls.on('centerOnFlights', () => {
      this.centerOnFlights();
    });

    this.controls.on('updateIntervalChanged', (interval) => {
      this.flightDataService.stopAutoUpdate();
      this.flightDataService.startAutoUpdate(interval);
    });

    // Map events
    this.mapService.on('mapClick', (data) => {
      // Handle map clicks for aircraft selection
      this.handleMapClick(data);
    });

    // Flight Renderer events
    this.flightRenderer.on('aircraftSelected', (data) => {
      this.handleAircraftSelection(data);
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flightDataService.stopAutoUpdate();
      } else if (this.controls.getSettings().autoUpdate) {
        this.flightDataService.startAutoUpdate();
      }
    });
  }

  /**
   * Start the application
   */
  async start() {
    // Set initial status
    this.controls.setLoadingStatus(true);
    
    // Get initial flight data
    await this.refreshFlightData();
    
    // Set up periodic updates
    const settings = this.controls.getSettings();
    if (settings.autoUpdate) {
      this.flightDataService.startAutoUpdate(settings.updateInterval);
    }
  }

  /**
   * Handle flight data updates
   */
  handleFlightUpdate(data) {
    const { flights, stats } = data;
    
    this.currentFlights = flights;
    
    // Update UI components
    this.flightPanel.updateFlights(flights);
    this.flightPanel.updateStats(stats);
    
    // Update renderer
    this.flightRenderer.updateFlights(flights);
    
    // Update connection status
    this.controls.setConnectionStatus(true, stats.totalFlights);
    
    console.log(`📊 Updated: ${flights.length} flights visible`);
  }

  /**
   * Handle flight search
   */
  async handleFlightSearch(searchData) {
    try {
      this.searchBar.showLoading();
      
      const results = await this.flightDataService.searchFlights(searchData.query);
      this.searchBar.displayResults(results);
      
    } catch (error) {
      console.error('Search failed:', error);
      this.searchBar.showError('Search failed. Please try again.');
    }
  }

  /**
   * Handle flight selection
   */
  handleFlightSelection(flight) {
    if (!flight) return;
    
    // Center map on selected flight
    if (flight.latitude && flight.longitude) {
      this.mapService.flyTo({
        center: [flight.longitude, flight.latitude],
        zoom: 10,
        pitch: 60
      });
    }
    
    // Select in renderer
    this.flightRenderer.selectAircraft(flight.icao24);
    
    console.log(`✈️ Selected flight: ${flight.callsign || flight.icao24}`);
  }

  /**
   * Handle aircraft selection from 3D renderer
   */
  handleAircraftSelection(data) {
    const flight = this.currentFlights.find(f => f.icao24 === data.icao24);
    if (flight) {
      this.flightPanel.selectFlight(flight.icao24);
    }
  }

  /**
   * Handle map clicks
   */
  handleMapClick(data) {
    // This could be used for selecting aircraft by clicking on them
    // Implementation would depend on specific requirements
  }

  /**
   * Refresh flight data manually
   */
  async refreshFlightData() {
    try {
      this.controls.setLoadingStatus(true);
      
      // Get current map bounds for more relevant data
      const bounds = this.mapService.getBounds();
      const boundsObj = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      await this.flightDataService.getAllFlights(boundsObj);
      
    } catch (error) {
      console.error('Failed to refresh flight data:', error);
      this.controls.setConnectionStatus(false);
    }
  }

  /**
   * Center map on all visible flights
   */
  centerOnFlights() {
    if (!this.currentFlights || this.currentFlights.length === 0) return;
    
    // Calculate bounds of all flights
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    this.currentFlights.forEach(flight => {
      if (flight.latitude && flight.longitude) {
        minLat = Math.min(minLat, flight.latitude);
        maxLat = Math.max(maxLat, flight.latitude);
        minLng = Math.min(minLng, flight.longitude);
        maxLng = Math.max(maxLng, flight.longitude);
      }
    });
    
    if (minLat !== Infinity) {
      // Add some padding
      const padding = 0.1;
      const bounds = [
        [minLng - padding, minLat - padding],
        [maxLng + padding, maxLat + padding]
      ];
      
      this.mapService.map.fitBounds(bounds, {
        padding: 50,
        duration: 2000
      });
    }
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.opacity = '1';
      loadingEl.style.pointerEvents = 'auto';
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      loadingEl.style.pointerEvents = 'none';
      
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 500);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div style="text-align: center; color: #ff6b6b;">
          <h2>⚠️ Error</h2>
          <p>${message}</p>
          <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
          ">Reload Page</button>
        </div>
      `;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.flightDataService) {
      this.flightDataService.destroy();
    }
    
    if (this.flightRenderer) {
      this.flightRenderer.destroy();
    }
    
    if (this.mapService) {
      this.mapService.destroy();
    }
    
    if (this.flightPanel) {
      this.flightPanel.destroy();
    }
    
    if (this.searchBar) {
      this.searchBar.destroy();
    }
    
    if (this.controls) {
      this.controls.destroy();
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new FlightSimulatorApp();
  app.init().catch(error => {
    console.error('Failed to start application:', error);
  });
  
  // Make app globally available for debugging
  window.flightApp = app;
});

// Handle any unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

