/**
 * Controls Component
 * Map controls and settings panel
 */
export class Controls {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.eventListeners = new Map();
    this.settings = {
      autoUpdate: true,
      showTrails: true,
      showLabels: true,
      maxAircraft: 1000,
      updateInterval: 10000,
      mapStyle: 'satellite'
    };
    
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.className = 'controls-panel ui-panel';
    this.element.innerHTML = this.getTemplate();
    
    this.container.appendChild(this.element);
    this.setupEventListeners();
  }

  getTemplate() {
    return `
      <div class="controls-container">
        <div class="control-group">
          <button class="btn" id="play-pause-btn" title="Play/Pause Updates">
            <span id="play-pause-icon">⏸️</span>
          </button>
          
          <button class="btn btn-secondary" id="center-btn" title="Center on Flights">
            🎯
          </button>
          
          <button class="btn btn-secondary" id="3d-toggle" title="Toggle 3D View">
            🌍
          </button>
          
          <button class="btn btn-secondary" id="settings-toggle" title="Settings">
            ⚙️
          </button>
        </div>
        
        <div class="settings-panel" id="settings-panel" style="display: none;">
          <div class="settings-header">
            <h4>Settings</h4>
            <button class="btn btn-secondary" id="close-settings">✕</button>
          </div>
          
          <div class="settings-content">
            <div class="setting-group">
              <label>Map Style</label>
              <select id="map-style-select">
                <option value="satellite">Satellite</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="outdoors">Outdoors</option>
                <option value="navigation">Navigation</option>
              </select>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-update" checked>
                Auto Update
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="show-trails" checked>
                Show Flight Trails
              </label>
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="show-labels" checked>
                Show Aircraft Labels
              </label>
            </div>
            
            <div class="setting-group">
              <label>Update Interval (seconds)</label>
              <input type="range" id="update-interval" min="5" max="60" value="10" step="5">
              <span id="interval-value">10s</span>
            </div>
            
            <div class="setting-group">
              <label>Max Aircraft</label>
              <input type="range" id="max-aircraft" min="100" max="2000" value="1000" step="100">
              <span id="max-aircraft-value">1000</span>
            </div>
            
            <div class="setting-group">
              <label>Performance</label>
              <select id="performance-mode">
                <option value="high">High Quality</option>
                <option value="medium" selected>Balanced</option>
                <option value="low">Performance</option>
              </select>
            </div>
            
            <div class="setting-actions">
              <button class="btn" id="reset-settings">Reset to Default</button>
              <button class="btn btn-secondary" id="export-settings">Export</button>
            </div>
          </div>
        </div>
        
        <div class="status-indicator" id="status-indicator">
          <div class="status-dot" id="status-dot"></div>
          <span id="status-text">Connecting...</span>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Play/Pause button
    const playPauseBtn = this.element.querySelector('#play-pause-btn');
    playPauseBtn.addEventListener('click', () => {
      this.toggleAutoUpdate();
    });

    // Center button
    const centerBtn = this.element.querySelector('#center-btn');
    centerBtn.addEventListener('click', () => {
      this.emit('centerOnFlights');
    });

    // 3D toggle
    const toggle3DBtn = this.element.querySelector('#3d-toggle');
    toggle3DBtn.addEventListener('click', () => {
      this.toggle3DView();
    });

    // Settings toggle
    const settingsToggle = this.element.querySelector('#settings-toggle');
    settingsToggle.addEventListener('click', () => {
      this.toggleSettings();
    });

    // Close settings
    const closeSettings = this.element.querySelector('#close-settings');
    closeSettings.addEventListener('click', () => {
      this.hideSettings();
    });

    // Map style
    const mapStyleSelect = this.element.querySelector('#map-style-select');
    mapStyleSelect.addEventListener('change', (e) => {
      this.settings.mapStyle = e.target.value;
      this.emit('mapStyleChanged', e.target.value);
    });

    // Auto update checkbox
    const autoUpdateCheck = this.element.querySelector('#auto-update');
    autoUpdateCheck.addEventListener('change', (e) => {
      this.settings.autoUpdate = e.target.checked;
      this.updatePlayPauseButton();
      this.emit('autoUpdateChanged', e.target.checked);
    });

    // Show trails checkbox
    const showTrailsCheck = this.element.querySelector('#show-trails');
    showTrailsCheck.addEventListener('change', (e) => {
      this.settings.showTrails = e.target.checked;
      this.emit('showTrailsChanged', e.target.checked);
    });

    // Show labels checkbox
    const showLabelsCheck = this.element.querySelector('#show-labels');
    showLabelsCheck.addEventListener('change', (e) => {
      this.settings.showLabels = e.target.checked;
      this.emit('showLabelsChanged', e.target.checked);
    });

    // Update interval slider
    const updateIntervalSlider = this.element.querySelector('#update-interval');
    const intervalValue = this.element.querySelector('#interval-value');
    updateIntervalSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.settings.updateInterval = value * 1000; // Convert to milliseconds
      intervalValue.textContent = `${value}s`;
      this.emit('updateIntervalChanged', this.settings.updateInterval);
    });

    // Max aircraft slider
    const maxAircraftSlider = this.element.querySelector('#max-aircraft');
    const maxAircraftValue = this.element.querySelector('#max-aircraft-value');
    maxAircraftSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.settings.maxAircraft = value;
      maxAircraftValue.textContent = value.toString();
      this.emit('maxAircraftChanged', value);
    });

    // Performance mode
    const performanceMode = this.element.querySelector('#performance-mode');
    performanceMode.addEventListener('change', (e) => {
      this.emit('performanceModeChanged', e.target.value);
    });

    // Reset settings
    const resetSettings = this.element.querySelector('#reset-settings');
    resetSettings.addEventListener('click', () => {
      this.resetSettings();
    });

    // Export settings
    const exportSettings = this.element.querySelector('#export-settings');
    exportSettings.addEventListener('click', () => {
      this.exportSettings();
    });
  }

  toggleAutoUpdate() {
    this.settings.autoUpdate = !this.settings.autoUpdate;
    const autoUpdateCheck = this.element.querySelector('#auto-update');
    autoUpdateCheck.checked = this.settings.autoUpdate;
    
    this.updatePlayPauseButton();
    this.emit('autoUpdateChanged', this.settings.autoUpdate);
  }

  updatePlayPauseButton() {
    const playPauseIcon = this.element.querySelector('#play-pause-icon');
    const playPauseBtn = this.element.querySelector('#play-pause-btn');
    
    if (this.settings.autoUpdate) {
      playPauseIcon.textContent = '⏸️';
      playPauseBtn.title = 'Pause Updates';
    } else {
      playPauseIcon.textContent = '▶️';
      playPauseBtn.title = 'Resume Updates';
    }
  }

  toggle3DView() {
    this.emit('toggle3D');
  }

  toggleSettings() {
    const settingsPanel = this.element.querySelector('#settings-panel');
    const isVisible = settingsPanel.style.display !== 'none';
    
    if (isVisible) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  showSettings() {
    const settingsPanel = this.element.querySelector('#settings-panel');
    settingsPanel.style.display = 'block';
    
    // Update form values with current settings
    this.updateSettingsForm();
  }

  hideSettings() {
    const settingsPanel = this.element.querySelector('#settings-panel');
    settingsPanel.style.display = 'none';
  }

  updateSettingsForm() {
    const mapStyleSelect = this.element.querySelector('#map-style-select');
    const autoUpdateCheck = this.element.querySelector('#auto-update');
    const showTrailsCheck = this.element.querySelector('#show-trails');
    const showLabelsCheck = this.element.querySelector('#show-labels');
    const updateIntervalSlider = this.element.querySelector('#update-interval');
    const maxAircraftSlider = this.element.querySelector('#max-aircraft');
    const intervalValue = this.element.querySelector('#interval-value');
    const maxAircraftValue = this.element.querySelector('#max-aircraft-value');
    
    mapStyleSelect.value = this.settings.mapStyle;
    autoUpdateCheck.checked = this.settings.autoUpdate;
    showTrailsCheck.checked = this.settings.showTrails;
    showLabelsCheck.checked = this.settings.showLabels;
    updateIntervalSlider.value = this.settings.updateInterval / 1000;
    maxAircraftSlider.value = this.settings.maxAircraft;
    intervalValue.textContent = `${this.settings.updateInterval / 1000}s`;
    maxAircraftValue.textContent = this.settings.maxAircraft.toString();
  }

  resetSettings() {
    this.settings = {
      autoUpdate: true,
      showTrails: true,
      showLabels: true,
      maxAircraft: 1000,
      updateInterval: 10000,
      mapStyle: 'satellite'
    };
    
    this.updateSettingsForm();
    this.updatePlayPauseButton();
    
    // Emit all setting changes
    Object.entries(this.settings).forEach(([key, value]) => {
      this.emit(`${key}Changed`, value);
    });
  }

  exportSettings() {
    const settingsJson = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapbox-plane-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  updateStatus(status, message) {
    const statusDot = this.element.querySelector('#status-dot');
    const statusText = this.element.querySelector('#status-text');
    
    statusDot.className = `status-dot status-${status}`;
    statusText.textContent = message;
  }

  setConnectionStatus(connected, flightCount = 0) {
    if (connected) {
      this.updateStatus('connected', `Live • ${flightCount} flights`);
    } else {
      this.updateStatus('disconnected', 'Disconnected');
    }
  }

  setLoadingStatus(isLoading) {
    if (isLoading) {
      this.updateStatus('loading', 'Loading...');
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSetting(key, value) {
    if (this.settings.hasOwnProperty(key)) {
      this.settings[key] = value;
      this.updateSettingsForm();
    }
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

