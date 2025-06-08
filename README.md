# ✈️ Mapbox Plane - Flight Route Simulator

> Flying with the 3D standard - Real-time flight tracking with 3D terrain visualization

A modern web application that provides real-time flight tracking with stunning 3D visualization using Mapbox GL JS. Watch aircraft fly around the world in real-time with detailed flight information, 3D terrain, and interactive controls.

![Flight Simulator Preview](https://via.placeholder.com/800x400/0a0a0a/00d4ff?text=Flight+Route+Simulator)

## 🌟 Features

### Real-time Flight Tracking
- **Live flight data** from multiple sources (OpenSky Network, Airplanes.live)
- **Real-time updates** every 5-10 seconds
- **Global coverage** with thousands of aircraft
- **Automatic data aggregation** and deduplication

### 3D Visualization
- **3D terrain** with Mapbox GL JS
- **Animated aircraft models** with realistic movement
- **Flight trails** showing aircraft paths
- **Smooth camera controls** and transitions
- **Globe projection** for immersive experience

### Interactive Interface
- **Flight search** by callsign, registration, or ICAO24
- **Detailed flight information** panels
- **Real-time statistics** and status indicators
- **Customizable settings** and preferences
- **Responsive design** for all devices

### Advanced Features
- **Aircraft categorization** by type and size
- **Performance optimization** for smooth rendering
- **Multiple map styles** (satellite, dark, light, etc.)
- **Altitude-based filtering** and visualization
- **Error handling** and fallback mechanisms

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Mapbox access token (free at [mapbox.com](https://account.mapbox.com/access-tokens/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidscmx/mapbox-plane.git
   cd mapbox-plane
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Mapbox access token
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required: Mapbox access token
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Optional: OpenSky Network credentials (for higher rate limits)
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password

# Application settings
NODE_ENV=development
PORT=3000
```

### Mapbox Access Token

1. Sign up at [Mapbox](https://account.mapbox.com/)
2. Create a new access token
3. Add the token to your `.env` file
4. The token should have these scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`

## 📡 Data Sources

### Primary APIs
- **[OpenSky Network](https://opensky-network.org/)** - Free ADS-B flight data
- **[Airplanes.live](https://airplanes.live/)** - Real-time aircraft positions
- **[adsb.fi](https://adsb.fi/)** - Alternative flight data source

### Data Features
- **Real-time positions** updated every 5-10 seconds
- **Flight details** including callsign, altitude, speed, heading
- **Aircraft information** with type classification
- **Global coverage** with automatic source switching
- **Rate limiting** and caching for optimal performance

## 🎮 Usage

### Basic Navigation
- **Mouse/Touch**: Pan and zoom the map
- **Scroll**: Zoom in/out
- **Right-click + drag**: Rotate the map
- **Ctrl + drag**: Adjust pitch (3D angle)

### Flight Interaction
- **Click aircraft**: Select and view details
- **Search flights**: Use the search bar for specific aircraft
- **Follow flights**: Center map on selected aircraft
- **View trails**: See flight paths and history

### Controls
- **Play/Pause**: Toggle real-time updates
- **Center**: Focus on all visible flights
- **3D Toggle**: Switch between 2D and 3D views
- **Settings**: Customize appearance and behavior

## 🏗️ Architecture

### Core Services
```
src/
├── services/
│   ├── MapService.js          # Mapbox GL JS integration
│   ├── FlightDataService.js   # Flight data aggregation
│   ├── FlightRenderer.js      # 3D aircraft rendering
│   └── ModelLoader.js         # 3D model management
├── components/
│   └── UI/                    # User interface components
├── utils/
│   ├── FlightAnimation.js     # Animation utilities
│   └── AircraftTypes.js       # Aircraft classification
└── config/
    └── mapbox.js              # Map configuration
```

### Data Flow
1. **Flight APIs** → FlightDataService (aggregation)
2. **FlightDataService** → FlightRenderer (3D visualization)
3. **FlightRenderer** → MapService (display on map)
4. **UI Components** ↔ Services (user interaction)

## 🎨 Customization

### Map Styles
Choose from multiple map styles:
- **Satellite**: High-resolution satellite imagery
- **Dark**: Dark theme for night viewing
- **Light**: Clean light theme
- **Outdoors**: Terrain and outdoor features
- **Navigation**: Optimized for navigation

### Aircraft Models
- **Automatic categorization** by aircraft type
- **Size-based scaling** (light, medium, heavy, super)
- **Color coding** by category
- **Custom 3D models** support (GLTF format)

### Performance Settings
- **Quality levels**: High, Medium, Low
- **Max aircraft limit**: Adjustable for performance
- **Update intervals**: Customizable refresh rates
- **Culling options**: Hide distant aircraft

## 🔧 Development

### Build Commands
```bash
npm run dev      # Development server with hot reload
npm run build    # Production build
npm start        # Start development server
```

### Project Structure
```
mapbox-plane/
├── src/                 # Source code
│   ├── components/      # UI components
│   ├── services/        # Core services
│   ├── utils/          # Utility functions
│   ├── styles/         # CSS styles
│   ├── assets/         # Static assets
│   └── main.js         # Application entry point
├── dist/               # Built files (generated)
├── webpack.config.js   # Build configuration
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Adding New Features

1. **New API Source**: Extend `FlightDataService`
2. **UI Components**: Add to `src/components/UI/`
3. **3D Models**: Place in `src/assets/models/`
4. **Styling**: Update `src/styles/main.css`

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy to Static Hosting
The built files in `dist/` can be deployed to:
- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Use the `gh-pages` branch
- **AWS S3**: Upload to S3 bucket with static hosting

### Environment Variables for Production
Make sure to set your production environment variables:
- `MAPBOX_ACCESS_TOKEN`: Your production Mapbox token
- `NODE_ENV=production`

## 📊 Performance

### Optimization Features
- **Level-of-detail rendering**: Simplified models at distance
- **Frustum culling**: Only render visible aircraft
- **Efficient data structures**: Optimized for real-time updates
- **Memory management**: Automatic cleanup of old data
- **Request batching**: Minimize API calls

### Performance Tips
- Limit max aircraft count for better performance
- Use lower quality settings on slower devices
- Increase update intervals to reduce load
- Close other browser tabs for better performance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Reporting Issues
- Use the [GitHub Issues](https://github.com/davidscmx/mapbox-plane/issues) page
- Include browser version and steps to reproduce
- Provide console error messages if available

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[OpenSky Network](https://opensky-network.org/)** for free flight data
- **[Mapbox](https://mapbox.com/)** for amazing mapping technology
- **[Three.js](https://threejs.org/)** for 3D graphics capabilities
- **[Airplanes.live](https://airplanes.live/)** for additional flight data

## 📞 Support

- **Documentation**: Check this README and code comments
- **Issues**: [GitHub Issues](https://github.com/davidscmx/mapbox-plane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davidscmx/mapbox-plane/discussions)

---

**Happy Flying!** ✈️ 🌍

