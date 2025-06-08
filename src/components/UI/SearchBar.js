/**
 * Search Bar Component
 * Allows users to search for specific flights
 */
export class SearchBar {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.eventListeners = new Map();
    this.searchTimeout = null;
    this.searchResults = [];
    
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'search-bar ui-panel';
    this.element.innerHTML = this.getTemplate();
    
    this.container.appendChild(this.element);
    this.setupEventListeners();
  }

  getTemplate() {
    return `
      <div class="search-container">
        <div class="search-input-group">
          <input 
            type="text" 
            id="flight-search" 
            placeholder="Search flights (callsign, registration, ICAO24)..."
            autocomplete="off"
          >
          <button class="search-btn" id="search-btn">🔍</button>
        </div>
        
        <div class="search-filters">
          <select id="search-type">
            <option value="all">All</option>
            <option value="callsign">Callsign</option>
            <option value="registration">Registration</option>
            <option value="icao24">ICAO24</option>
            <option value="aircraft-type">Aircraft Type</option>
          </select>
        </div>
        
        <div class="search-results" id="search-results" style="display: none;">
          <div class="results-header">
            <span class="results-count">0 results</span>
            <button class="btn btn-secondary" id="clear-search">Clear</button>
          </div>
          <div class="results-list" id="results-list"></div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const searchInput = this.element.querySelector('#flight-search');
    const searchBtn = this.element.querySelector('#search-btn');
    const searchType = this.element.querySelector('#search-type');
    const clearBtn = this.element.querySelector('#clear-search');

    // Search input with debouncing
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      if (query.length >= 2) {
        this.searchTimeout = setTimeout(() => {
          this.performSearch(query);
        }, 300);
      } else {
        this.hideResults();
      }
    });

    // Search button
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.performSearch(query);
      }
    });

    // Enter key search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
          this.performSearch(query);
        }
      }
    });

    // Search type change
    searchType.addEventListener('change', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.performSearch(query);
      }
    });

    // Clear search
    clearBtn.addEventListener('click', () => {
      this.clearSearch();
    });

    // Click outside to close results
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  async performSearch(query) {
    if (!query || query.length < 2) return;

    this.showLoading();
    
    try {
      const searchType = this.element.querySelector('#search-type').value;
      
      // Emit search event
      this.emit('search', {
        query: query,
        type: searchType
      });
      
    } catch (error) {
      console.error('Search failed:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  displayResults(results) {
    this.searchResults = results || [];
    
    const resultsContainer = this.element.querySelector('#search-results');
    const resultsCount = this.element.querySelector('.results-count');
    const resultsList = this.element.querySelector('#results-list');
    
    resultsCount.textContent = `${this.searchResults.length} result${this.searchResults.length !== 1 ? 's' : ''}`;
    
    if (this.searchResults.length === 0) {
      resultsList.innerHTML = `
        <div class="no-results">
          <p>No flights found matching your search.</p>
          <p>Try searching for:</p>
          <ul>
            <li>Flight callsign (e.g., "UAL123")</li>
            <li>Aircraft registration (e.g., "N12345")</li>
            <li>ICAO24 hex code (e.g., "a1b2c3")</li>
            <li>Aircraft type (e.g., "B737")</li>
          </ul>
        </div>
      `;
    } else {
      resultsList.innerHTML = this.searchResults.map(flight => 
        this.createResultItem(flight)
      ).join('');
      
      // Add click listeners
      resultsList.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
          const icao24 = item.dataset.icao24;
          this.selectResult(icao24);
        });
      });
    }
    
    resultsContainer.style.display = 'block';
  }

  createResultItem(flight) {
    const callsign = flight.callsign || 'N/A';
    const icao24 = flight.icao24 || 'N/A';
    const registration = flight.registration || 'N/A';
    const aircraftType = flight.aircraftType || 'Unknown';
    const altitude = flight.altitudeFeet ? `${Math.round(flight.altitudeFeet).toLocaleString()}ft` : 'N/A';
    const speed = flight.speedKnots ? `${Math.round(flight.speedKnots)}kts` : 'N/A';
    const origin = flight.originCountry || 'Unknown';
    
    return `
      <div class="result-item" data-icao24="${icao24}">
        <div class="result-header">
          <span class="result-callsign">${callsign}</span>
          <span class="result-type">${aircraftType}</span>
        </div>
        <div class="result-details">
          <span>ICAO24: ${icao24}</span>
          <span>Reg: ${registration}</span>
        </div>
        <div class="result-details">
          <span>${altitude}</span>
          <span>${speed}</span>
          <span>${origin}</span>
        </div>
      </div>
    `;
  }

  selectResult(icao24) {
    const flight = this.searchResults.find(f => f.icao24 === icao24);
    if (flight) {
      this.emit('resultSelected', flight);
      this.hideResults();
      
      // Clear search input
      const searchInput = this.element.querySelector('#flight-search');
      searchInput.value = flight.callsign || flight.icao24;
    }
  }

  showLoading() {
    const resultsContainer = this.element.querySelector('#search-results');
    const resultsList = this.element.querySelector('#results-list');
    const resultsCount = this.element.querySelector('.results-count');
    
    resultsCount.textContent = 'Searching...';
    resultsList.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-spinner-small"></div>
        Searching flights...
      </div>
    `;
    
    resultsContainer.style.display = 'block';
  }

  showError(message) {
    const resultsContainer = this.element.querySelector('#search-results');
    const resultsList = this.element.querySelector('#results-list');
    const resultsCount = this.element.querySelector('.results-count');
    
    resultsCount.textContent = 'Error';
    resultsList.innerHTML = `
      <div class="error-message">
        ⚠️ ${message}
      </div>
    `;
    
    resultsContainer.style.display = 'block';
  }

  hideResults() {
    const resultsContainer = this.element.querySelector('#search-results');
    resultsContainer.style.display = 'none';
  }

  clearSearch() {
    const searchInput = this.element.querySelector('#flight-search');
    searchInput.value = '';
    this.hideResults();
    this.searchResults = [];
    
    this.emit('searchCleared');
  }

  setPlaceholder(text) {
    const searchInput = this.element.querySelector('#flight-search');
    searchInput.placeholder = text;
  }

  focus() {
    const searchInput = this.element.querySelector('#flight-search');
    searchInput.focus();
  }

  // Quick search suggestions
  showSuggestions(suggestions) {
    const resultsList = this.element.querySelector('#results-list');
    const resultsContainer = this.element.querySelector('#search-results');
    const resultsCount = this.element.querySelector('.results-count');
    
    if (!suggestions || suggestions.length === 0) {
      this.hideResults();
      return;
    }
    
    resultsCount.textContent = `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`;
    
    resultsList.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-value="${suggestion.value}">
        <span class="suggestion-text">${suggestion.text}</span>
        <span class="suggestion-type">${suggestion.type}</span>
      </div>
    `).join('');
    
    // Add click listeners for suggestions
    resultsList.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const value = item.dataset.value;
        const searchInput = this.element.querySelector('#flight-search');
        searchInput.value = value;
        this.performSearch(value);
      });
    });
    
    resultsContainer.style.display = 'block';
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
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.eventListeners.clear();
  }
}

