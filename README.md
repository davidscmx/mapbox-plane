# ✈️ Mapbox Flight Tracker

A real-time 3D flight tracking application built with Mapbox GL JS, featuring live aircraft data, 3D terrain visualization, and interactive flight exploration.

![Flight Tracker Demo](https://img.shields.io/badge/Status-Ready%20to%20Fly-green)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS-blue)

## 🚀 Features

### ✈️ **Real-Time Flight Data**
- Live aircraft positions from multiple APIs
- OpenSky Network integration
- Mock flight data for development
- Automatic fallback when APIs are unavailable

### 🌍 **3D Visualization**
- Interactive 3D terrain with Mapbox GL JS
- Smooth aircraft animations
- Real-time position updates
- Click to view flight details

### 🎮 **Interactive Controls**
- Play/pause live updates
- Center on flights
- 3D terrain toggle
- Search flights by callsign
- Zoom and pan controls

### 🛡️ **Production Ready**
- CORS-free backend proxy
- Rate limiting and error handling
- Environment variable configuration
- GitHub Actions deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Flight APIs   │
│   (Webpack)     │◄──►│   (Express)     │◄──►│   (OpenSky)     │
│                 │    │                 │    │   (Mock Data)   │
│ • Mapbox GL JS  │    │ • CORS Proxy    │    │                 │
│ • 3D Rendering  │    │ • Rate Limiting │    │                 │
│ • UI Controls   │    │ • Auth Handling │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Mapbox access token (free at [mapbox.com](https://account.mapbox.com/access-tokens/))

### 1. Clone and Install
```bash
git clone https://github.com/davidscmx/mapbox-plane.git
cd mapbox-plane
npm run install:all
```

### 2. Configure Environment
```bash
# Copy environment files
cp .env.example .env
cp server/.env.example server/.env

# Edit .env files with your Mapbox token
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

### 3. Start Development
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:client  # Frontend on http://localhost:3000
npm run dev:server  # Backend on http://localhost:3001
```

### 4. Open Your Browser
Navigate to `http://localhost:3000` and watch planes fly! ✈️

## 📁 Project Structure

```
mapbox-plane/
├── src/                    # Frontend source code
│   ├── components/         # UI components
│   │   └── UI/            # Controls, panels, search
│   ├── services/          # Data services
│   │   ├── api/           # API integrations
│   │   ├── FlightDataService.js
│   │   ├── FlightRenderer.js
│   │   └── MapService.js
│   ├── styles/            # CSS styles
│   └── main.js            # Application entry point
├── server/                # Backend server
│   ├── server.js          # Express server
│   ├── package.json       # Server dependencies
│   └── .env.example       # Server environment template
├── dist/                  # Built frontend files
├── webpack.config.js      # Frontend build configuration
└── package.json           # Root package configuration
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```bash
MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

#### Backend (server/.env)
```bash
PORT=3001
NODE_ENV=development
OPENSKY_USERNAME=optional_username
OPENSKY_PASSWORD=optional_password
```

### API Configuration

#### OpenSky Network
- **Free**: 400 requests/day, no authentication
- **Registered**: 4000 requests/day with username/password
- **Rate Limit**: 10 seconds between requests

#### Mock API
- **Always Available**: Generates realistic flight data
- **No Rate Limits**: Perfect for development
- **Configurable**: Adjust flight count and locations

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Set GitHub secrets in your repository:
   - `MAPBOX_ACCESS_TOKEN`: Your Mapbox token
   - `OPENSKY_USERNAME`: (Optional) OpenSky username
   - `OPENSKY_PASSWORD`: (Optional) OpenSky password

2. Push to main branch - GitHub Actions will deploy automatically

### Manual Deployment
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
# Build and run with Docker
docker build -t flight-tracker .
docker run -p 3001:3001 -e MAPBOX_ACCESS_TOKEN=your_token flight-tracker
```

## 🛠️ Development

### Adding New APIs
1. Create new API service in `src/services/api/`
2. Add backend proxy endpoint in `server/server.js`
3. Register API in `FlightDataService.js`

### Customizing UI
- Modify components in `src/components/UI/`
- Update styles in `src/styles/main.css`
- Add new controls in `Controls.js`

### Backend Extensions
- Add new endpoints in `server/server.js`
- Implement rate limiting and caching
- Add authentication middleware

## 🐛 Troubleshooting

### Common Issues

#### CORS Errors
- **Solution**: Make sure backend server is running on port 3001
- **Check**: Frontend is configured to use `http://localhost:3001/api/`

#### No Flight Data
- **Check**: Backend server logs for API errors
- **Fallback**: Mock API should always provide data
- **Rate Limits**: Wait between requests to avoid rate limiting

#### Mapbox Errors
- **Token**: Verify your Mapbox access token is valid
- **Quota**: Check your Mapbox account usage limits
- **Network**: Ensure internet connection for map tiles

### Debug Mode
```bash
# Enable verbose logging
NODE_ENV=development npm run dev
```

## 📊 Performance

### Optimization Features
- **Efficient Rendering**: Only update visible aircraft
- **Smart Caching**: Cache flight data to reduce API calls
- **Rate Limiting**: Prevent API quota exhaustion
- **Lazy Loading**: Load components as needed

### Monitoring
- Backend logs API response times
- Frontend tracks render performance
- Rate limiting prevents overuse

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenSky Network** for free flight data API
- **Mapbox** for incredible 3D mapping platform
- **ADS-B Exchange** for additional flight data sources
- **Aviation Community** for open data initiatives

## 🔗 Links

- [Live Demo](https://davidscmx.github.io/mapbox-plane/) (Coming Soon)
- [Mapbox Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [OpenSky Network API](https://opensky-network.org/apidoc/)
- [Flight Tracking Guide](https://github.com/davidscmx/mapbox-plane/wiki)

---

**Ready to track some flights?** 🛫 Get your Mapbox token and let's fly! ✈️

