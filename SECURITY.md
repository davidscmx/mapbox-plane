# 🔐 Security Guidelines

## API Key Management

### ❌ **NEVER DO THIS**
- Don't commit API keys to GitHub
- Don't hardcode secrets in source code
- Don't share .env files publicly
- Don't put secrets in client-side code that's exposed

### ✅ **PROPER API KEY HANDLING**

#### **Local Development**
1. Copy `.env.example` to `.env`
2. Add your API keys to `.env`
3. The `.env` file is in `.gitignore` and won't be committed

#### **Production Deployment**

**GitHub Pages/Actions:**
1. Go to your repository Settings
2. Navigate to Secrets and Variables → Actions
3. Add these secrets:
   - `MAPBOX_ACCESS_TOKEN`: Your Mapbox token
   - `OPENSKY_USERNAME`: (Optional) OpenSky username
   - `OPENSKY_PASSWORD`: (Optional) OpenSky password

**Netlify:**
1. Go to Site Settings → Environment Variables
2. Add the same environment variables

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add the same environment variables

#### **Environment Variable Priority**
The application checks for API keys in this order:
1. `process.env.MAPBOX_ACCESS_TOKEN` (production)
2. `import.meta.env.VITE_MAPBOX_ACCESS_TOKEN` (Vite builds)
3. Demo token (limited functionality)

## Security Best Practices

### **API Key Rotation**
- Rotate API keys regularly
- Use different keys for development and production
- Monitor API key usage in provider dashboards

### **Rate Limiting**
- The application includes built-in rate limiting
- OpenSky Network: 400 requests/day (anonymous), 4000/day (authenticated)
- Airplanes.live: No authentication required
- Mapbox: Generous free tier with usage monitoring

### **CORS and Security Headers**
- APIs are accessed from the browser (client-side)
- All flight APIs support CORS for browser requests
- No server-side proxy needed for basic functionality

### **Data Privacy**
- No user data is stored or transmitted
- Flight data is public information from ADS-B transponders
- No personal information is collected

## Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public issue
2. Email the maintainer directly
3. Include details about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Compliance

This application:
- Uses only public flight tracking data
- Complies with API provider terms of service
- Does not store or redistribute sensitive data
- Follows web security best practices

## Quick Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] API keys are set as GitHub secrets for deployment
- [ ] No hardcoded secrets in source code
- [ ] Rate limiting is implemented
- [ ] Error handling doesn't expose sensitive information
- [ ] HTTPS is used for all API requests

