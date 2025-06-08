/**
 * Flight Panel Component
 * Displays flight information and statistics
 */
export class FlightPanel {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.flights = [];
    this.stats = {};
    this.selectedFlight = null;
    this.eventListeners = new Map();
    
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'flight-panel ui-panel';
    this.element.innerHTML = this.getTemplate();
    
    this.container.appendChild(this.element);
    this.setupEventListeners();
  }

  getTemplate() {
    return `
      <div class="panel-header">
        <h3>✈️ Live Flights</h3>
        <div class="panel-controls">
          <button class="btn btn-secondary" id="refresh-btn">🔄</button>
          <button class="btn btn-secondary" id="settings-btn">⚙️</button>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value" id="total-flights">0</span>
          <span class="stat-label">Total Flights</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="active-flights">0</span>
          <span class="stat-label">In Air</span>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="section-header">
          <h4>Flight List</h4>
          <div class="filter-controls">
            <select id="sort-select">
              <option value="callsign">Callsign</option>
              <option value="altitude">Altitude</option>
              <option value="speed">Speed</option>
              <option value="distance">Distance</option>
            </select>
          </div>
        </div>
        
        <div class="flight-list" id="flight-list">
          <div class="loading-indicator">
            <div class="loading-spinner-small"></div>
            Loading flights...
          </div>
        </div>
      </div>
      
      <div class="panel-section" id="flight-details" style="display: none;">
        <div class="section-header">
          <h4>Flight Details</h4>
          <button class="btn btn-secondary" id="close-details">✕</button>
        </div>
        <div id="flight-details-content"></div>
      </div>
    `;
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = this.element.querySelector('#refresh-btn');
    refreshBtn.addEventListener('click', () => {
      this.emit('refresh');
    });

    // Settings button
    const settingsBtn = this.element.querySelector('#settings-btn');
    settingsBtn.addEventListener('click', () => {
      this.emit('settings');
    });

    // Sort select
    const sortSelect = this.element.querySelector('#sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.sortFlights(e.target.value);
    });

    // Close details button
    const closeDetailsBtn = this.element.querySelector('#close-details');
    closeDetailsBtn.addEventListener('click', () => {
      this.hideFlightDetails();
    });
  }

  updateStats(stats) {
    this.stats = stats;
    
    const totalFlightsEl = this.element.querySelector('#total-flights');
    const activeFlightsEl = this.element.querySelector('#active-flights');
    
    if (totalFlightsEl) {
      totalFlightsEl.textContent = stats.totalFlights || 0;
    }
    
    if (activeFlightsEl) {
      activeFlightsEl.textContent = stats.activeFlights || 0;
    }
  }

  updateFlights(flights) {
    this.flights = flights || [];
    this.renderFlightList();
  }

  renderFlightList() {
    const flightListEl = this.element.querySelector('#flight-list');
    
    if (!this.flights || this.flights.length === 0) {
      flightListEl.innerHTML = `
        <div class="loading-indicator">
          <div class="loading-spinner-small"></div>
          No flights available
        </div>
      `;
      return;
    }

    // Sort flights
    const sortBy = this.element.querySelector('#sort-select').value;
    const sortedFlights = this.getSortedFlights(sortBy);

    // Limit to first 50 flights for performance
    const displayFlights = sortedFlights.slice(0, 50);

    flightListEl.innerHTML = displayFlights.map(flight => 
      this.createFlightItem(flight)
    ).join('');

    // Add click listeners to flight items
    flightListEl.querySelectorAll('.flight-item').forEach(item => {
      item.addEventListener('click', () => {
        const icao24 = item.dataset.icao24;
        this.selectFlight(icao24);
      });
    });
  }

  createFlightItem(flight) {
    const callsign = flight.callsign || flight.icao24 || 'Unknown';
    const altitude = flight.altitudeFeet ? `${Math.round(flight.altitudeFeet).toLocaleString()}ft` : 'N/A';
    const speed = flight.speedKnots ? `${Math.round(flight.speedKnots)}kts` : 'N/A';
    const origin = flight.originCountry || 'Unknown';
    
    return `
      <div class="flight-item" data-icao24="${flight.icao24}">
        <div class="flight-callsign">${callsign}</div>
        <div class="flight-details">
          <span>${altitude}</span>
          <span>${speed}</span>
        </div>
        <div class="flight-details">
          <span>${origin}</span>
          <span class="flight-source">${flight.source}</span>
        </div>
      </div>
    `;
  }

  getSortedFlights(sortBy) {
    const flights = [...this.flights];
    
    switch (sortBy) {
      case 'callsign':
        return flights.sort((a, b) => {
          const aCallsign = a.callsign || a.icao24 || '';
          const bCallsign = b.callsign || b.icao24 || '';
          return aCallsign.localeCompare(bCallsign);
        });
      
      case 'altitude':
        return flights.sort((a, b) => (b.altitudeFeet || 0) - (a.altitudeFeet || 0));
      
      case 'speed':
        return flights.sort((a, b) => (b.speedKnots || 0) - (a.speedKnots || 0));
      
      case 'distance':
        // This would require calculating distance from map center
        return flights;
      
      default:
        return flights;
    }
  }

  selectFlight(icao24) {
    const flight = this.flights.find(f => f.icao24 === icao24);
    if (!flight) return;

    this.selectedFlight = flight;
    this.showFlightDetails(flight);
    this.emit('flightSelected', flight);

    // Highlight selected item
    this.element.querySelectorAll('.flight-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = this.element.querySelector(`[data-icao24="${icao24}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }

  showFlightDetails(flight) {
    const detailsSection = this.element.querySelector('#flight-details');
    const detailsContent = this.element.querySelector('#flight-details-content');
    
    detailsContent.innerHTML = this.createFlightDetailsHTML(flight);
    detailsSection.style.display = 'block';
  }

  createFlightDetailsHTML(flight) {
    const callsign = flight.callsign || 'N/A';
    const icao24 = flight.icao24 || 'N/A';
    const registration = flight.registration || 'N/A';
    const aircraftType = flight.aircraftType || 'Unknown';
    const altitude = flight.altitudeFeet ? `${Math.round(flight.altitudeFeet).toLocaleString()} ft` : 'N/A';
    const speed = flight.speedKnots ? `${Math.round(flight.speedKnots)} kts` : 'N/A';
    const heading = flight.trueTrack ? `${Math.round(flight.trueTrack)}°` : 'N/A';
    const verticalRate = flight.verticalRate ? `${Math.round(flight.verticalRate * 196.85)} ft/min` : 'N/A';
    const origin = flight.originCountry || 'Unknown';
    const onGround = flight.onGround ? 'Yes' : 'No';
    const lastSeen = flight.lastContact ? new Date(flight.lastContact * 1000).toLocaleTimeString() : 'N/A';
    
    return `
      <div class="flight-detail-grid">
        <div class="detail-row">
          <span class="detail-label">Callsign:</span>
          <span class="detail-value">${callsign}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ICAO24:</span>
          <span class="detail-value">${icao24}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Registration:</span>
          <span class="detail-value">${registration}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Aircraft:</span>
          <span class="detail-value">${aircraftType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Altitude:</span>
          <span class="detail-value">${altitude}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Speed:</span>
          <span class="detail-value">${speed}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Heading:</span>
          <span class="detail-value">${heading}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Vertical Rate:</span>
          <span class="detail-value">${verticalRate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Origin:</span>
          <span class="detail-value">${origin}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">On Ground:</span>
          <span class="detail-value">${onGround}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Last Seen:</span>
          <span class="detail-value">${lastSeen}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Source:</span>
          <span class="detail-value">${flight.source}</span>
        </div>
      </div>
      
      <div class="detail-actions">
        <button class="btn" id="follow-flight">📍 Follow</button>
        <button class="btn btn-secondary" id="flight-info">ℹ️ More Info</button>
      </div>
    `;
  }

  hideFlightDetails() {
    const detailsSection = this.element.querySelector('#flight-details');
    detailsSection.style.display = 'none';
    
    this.selectedFlight = null;
    
    // Remove selection highlight
    this.element.querySelectorAll('.flight-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    this.emit('flightDeselected');
  }

  setLoading(isLoading) {
    const flightListEl = this.element.querySelector('#flight-list');
    
    if (isLoading) {
      flightListEl.innerHTML = `
        <div class="loading-indicator">
          <div class="loading-spinner-small"></div>
          Loading flights...
        </div>
      `;
    }
  }

  showError(message) {
    const flightListEl = this.element.querySelector('#flight-list');
    flightListEl.innerHTML = `
      <div class="error-message">
        ⚠️ ${message}
      </div>
    `;
  }

  // Event emitter functionality
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

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.eventListeners.clear();
  }
}

