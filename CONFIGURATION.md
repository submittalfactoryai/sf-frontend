# Frontend Configuration Guide

This guide explains how to configure the frontend for different deployment scenarios to ensure robust communication with the backend.

## Automatic Configuration

The frontend automatically detects the backend URL using the following priority:

1. **Environment Variable**: `VITE_API_BASE_URL`
2. **Runtime Detection**: Based on current browser location
3. **Fallback**: `http://localhost:8000`

## Environment Variable Configuration

Create a `.env.local` file in the frontend directory for custom configuration:

```bash
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000
```

### Common Scenarios

#### Same Machine Development
```bash
VITE_API_BASE_URL=http://localhost:8000
```

#### Different Machine on Local Network
```bash
VITE_API_BASE_URL=http://192.168.1.100:8000
```

#### Production Server
```bash
VITE_API_BASE_URL=https://api.your-domain.com
```

#### AWS EC2 or Cloud Instance
```bash
VITE_API_BASE_URL=http://your-ec2-ip:8000
```

#### Docker Deployment
```bash
VITE_API_BASE_URL=http://backend:8000
```

## Runtime Detection Rules

If no environment variable is set, the frontend uses these rules:

- **Port 5173/3000/4173**: Development mode → `http://hostname:8000`
- **Port 8000**: Backend co-located → `http://hostname:8000`
- **Port 80/443**: Production mode → `http://hostname` (same origin)
- **Other ports**: Default to → `http://hostname:8000`

## Development vs Production

### Development Mode (`npm run dev`)
- Uses Vite proxy for `/api/*` requests
- Proxy forwards to backend automatically
- Enhanced logging for debugging

### Production Mode (`npm run build`)
- No proxy - direct API calls to backend
- Uses runtime URL detection or environment variable
- Must ensure CORS is properly configured on backend

## Troubleshooting

### Connection Issues
1. Check if backend is running: `curl http://localhost:8000/api/health`
2. Verify CORS settings in backend configuration
3. Check network connectivity between machines
4. Ensure firewall allows port 8000

### Port Conflicts
- Frontend development: Port 5173 (fallback to next available)
- Frontend preview: Port 4173 (fallback to next available)
- Backend: Port 8000 (configurable via backend config)

### Cross-Platform Issues
- Use IP addresses instead of `localhost` for cross-machine access
- Ensure both machines are on the same network
- Check that backend binds to `0.0.0.0:8000` not `127.0.0.1:8000`

## Testing Configuration

### Health Check
The frontend provides an API health check:
```javascript
import { api } from './src/config/api';
api.health().then(console.log);
```

### Manual URL Testing
```javascript
import { buildApiUrl } from './src/config/api';
console.log('API Base URL:', buildApiUrl('/health'));
```

## Independence Features

- **No Hard Dependencies**: Frontend works independently of backend deployment
- **Flexible URL Detection**: Adapts to different hosting scenarios
- **Cross-Platform Support**: Works across different operating systems and networks
- **Graceful Fallbacks**: Multiple fallback mechanisms for robust operation 