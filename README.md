# Submittal Factory Frontend

Modern React TypeScript application for construction submittal validation with intelligent PDF processing.

## 🏗️ Architecture

The frontend is built with:
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **React PDF** - PDF viewing and processing capabilities
- **Lucide React** - Modern icon library

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html              # Main HTML template
│   ├── pdfjs-viewer/           # PDF.js viewer assets
│   └── assets/                 # Static assets
├── src/
│   ├── components/             # React components
│   │   ├── PDFViewer.tsx       # PDF viewing component
│   │   ├── FileUpload.tsx      # File upload interface
│   │   ├── ValidationResults.tsx # Results display
│   │   └── SearchInterface.tsx  # Search functionality
│   ├── config/
│   │   └── api.ts              # API configuration
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── App.tsx                 # Main application component
│   ├── main.tsx               # Application entry point
│   └── index.css              # Global styles
├── dist/                       # Production build output
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Environment variables template
├── package.json               # Dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── .dockerignore              # Docker build exclusions
├── Dockerfile                 # Container definition
└── nginx.conf                 # Nginx configuration for production
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend README)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API connection:**
   ```bash
   cp .env.example .env
   # Edit .env with backend URL
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Environment Configuration

Create `.env` file in the `frontend/` directory from `.env.example`:

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Optional: Enable debug logging
VITE_DEBUG=true

# Optional: PDF.js worker configuration
VITE_PDFJS_WORKER_SRC=/pdfjs-viewer/pdf.worker.min.js
```

**Common Backend URLs:**
- **Development**: `http://localhost:8000`
- **Production**: `https://api.yourdomain.com`
- **Docker Same Network**: `http://backend:8000`

## 🎯 Features

### Core Functionality

- **PDF Upload & Processing** - Drag-and-drop PDF upload with progress tracking
- **AI-Powered Extraction** - Intelligent data extraction from construction documents
- **Specification Validation** - Automatic validation against project requirements
- **PDF Viewer** - Built-in PDF viewer with annotation support
- **Search Interface** - Search for product submittals and specifications
- **Batch Processing** - Handle multiple documents simultaneously

### User Interface

- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Dark/Light Mode** - Automatic theme detection with manual toggle
- **Progress Tracking** - Real-time progress indicators for long operations
- **Error Handling** - User-friendly error messages and recovery options
- **Accessibility** - WCAG 2.1 compliant interface

### Advanced Features

- **PDF Annotation** - Highlight and annotate important sections
- **Export Options** - Export results in multiple formats (JSON, CSV, PDF)
- **Session Management** - Maintain state across browser sessions
- **Offline Support** - Basic functionality available offline

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Development Workflow

1. **Hot Reload** - Changes automatically refresh in development
2. **Type Safety** - TypeScript provides compile-time error checking
3. **Code Formatting** - Prettier ensures consistent code style
4. **Linting** - ESLint catches potential issues

### Adding New Components

1. Create component in `src/components/`
2. Define TypeScript interfaces in `src/types/`
3. Add Tailwind classes for styling
4. Export from appropriate index file
5. Update parent components to use new component

### API Integration

The frontend communicates with the backend through a centralized API configuration:

```typescript
// src/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Example API call
const response = await fetch(`${API_BASE_URL}/api/extract`, {
  method: 'POST',
  body: formData,
});
```

## 🎨 Styling

### Tailwind CSS

The application uses Tailwind CSS for styling:

```tsx
// Example component with Tailwind classes
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
    Upload PDF
  </button>
</div>
```

### Theme System

- **Light Mode** - Clean, professional interface
- **Dark Mode** - Reduced eye strain for extended use
- **System Preference** - Automatically detects OS theme preference

### Custom Styles

Global styles are defined in `src/index.css`:

```css
/* Custom utility classes */
.upload-area {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors;
}

.upload-area:hover {
  @apply border-blue-400 bg-blue-50;
}
```

## 📱 Components

### Core Components

**App.tsx** - Main application component
- Manages global state and routing
- Handles file uploads and processing
- Coordinates component interactions

**PDFViewer.tsx** - PDF display component
- Renders PDF documents with zoom controls
- Supports annotations and highlighting
- Handles page navigation

**FileUpload.tsx** - File upload interface
- Drag-and-drop functionality
- File validation and preview
- Progress tracking

**ValidationResults.tsx** - Results display
- Shows extraction and validation results
- Provides export options
- Handles error states

### Utility Components

**LoadingSpinner.tsx** - Loading indicators
**ErrorBoundary.tsx** - Error handling
**Modal.tsx** - Modal dialogs
**Tooltip.tsx** - Contextual help

## 🔧 Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

## 🚀 Docker Deployment

### Standalone Docker Deployment

The frontend can be deployed independently using Docker:

**Build and Run:**
```bash
# Build the Docker image
docker build -t submittal-frontend .

# Run as standalone container
docker run -d \
  --name submittal-frontend \
  -p 80:80 \
  --restart unless-stopped \
  submittal-frontend
```

**Environment Variables in Docker:**
```bash
# Create .env file with your backend URL
cp .env.example .env
echo "VITE_API_BASE_URL=http://your-backend-server:8000" > .env

# Rebuild with new environment
docker build -t submittal-frontend .
docker run -d -p 80:80 submittal-frontend
```

**Production Docker Setup:**
```bash
# Build for production
npm run build

# Build Docker image with production assets
docker build -t submittal-frontend .

# Run with custom port
docker run -d \
  --name submittal-frontend \
  -p 3000:80 \
  --restart unless-stopped \
  submittal-frontend
```

### Production Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Test production build locally
npm run preview
```

### Static Hosting

The built application (`dist/` folder) can be deployed to:
- **Nginx** - Use provided `nginx.conf`
- **Apache** - Configure for SPA routing
- **CDN** - Upload to AWS S3, Netlify, Vercel
- **GitHub Pages** - For static deployment

### Environment Variables

Production environment variables in `.env`:

```bash
# Production API URL
VITE_API_BASE_URL=https://api.yourdomain.com

# Disable debug logging
VITE_DEBUG=false
```

## 🔒 Security

### Content Security Policy

The application includes CSP headers for security:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'";
```

### API Security

- CORS headers properly configured
- File upload validation on frontend and backend
- No sensitive data stored in local storage

## 🐛 Troubleshooting

### Common Issues

**Development Server Won't Start:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API Connection Issues:**
```bash
# Check backend is running
curl http://localhost:8000/api/health

# Verify frontend .env file
cat .env

# Check CORS configuration in backend
# Make sure backend allows http://localhost:5173
```

**Build Failures:**
```bash
# Check TypeScript errors
npm run type-check

# Clear build cache
rm -rf dist .vite
npm run build
```

**PDF Viewer Issues:**
- Ensure PDF.js assets are in `public/pdfjs-viewer/`
- Check browser console for worker errors
- Verify MIME types are configured correctly

### Browser Compatibility

Supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance

- Bundle size: ~500KB gzipped
- First Contentful Paint: <1s
- Time to Interactive: <2s
- PDF rendering: 60 FPS

## 📊 Monitoring

### Error Tracking

The application includes error boundaries and logging:

```typescript
// Error boundary catches component errors
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Analytics

Basic usage analytics can be added:

```typescript
// Track file uploads
analytics.track('file_uploaded', {
  fileSize: file.size,
  fileType: file.type,
});
```

## 🤝 Contributing

### Development Guidelines

1. **TypeScript** - Use strict typing for all components
2. **Components** - Create reusable, testable components
3. **Styling** - Use Tailwind CSS classes consistently
4. **State** - Prefer local state over global state
5. **Testing** - Write unit tests for complex logic

### Code Style

```bash
# Format code before committing
npm run format

# Check for linting issues
npm run lint
```

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure build passes and no TypeScript errors
4. Submit PR with clear description

## 📄 License

This project is licensed under the MIT License. 