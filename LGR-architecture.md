# Let's Go Racing - Architecture Documentation

**Last Updated:** 2025-12-07
**Version:** 2.1.0
**Project:** Full-Stack Racing Dashboard Application

---

## 📋 Document Overview

This is the comprehensive architecture documentation for the **Let's Go Racing** project - a full-stack racing dashboard application that aggregates data from MotoGP and F1 races, provides weather information, and manages user preferences.

**Purpose:** Complete web application with Angular frontend, Express.js backend API, and serverless Lambda functions for external data integration

---

## 🏗️ Architecture Overview

### System Architecture Pattern
**Full-Stack Single Page Application (SPA) with Microservices Backend**

The application follows a modern full-stack architecture:
- **Angular Frontend (SPA):** Single Page Application with standalone components
- **Express.js Backend:** RESTful API server handling authentication, business logic, and data orchestration
- **AWS Lambda Functions:** Serverless functions for specific external integrations (weather, race data, file handling)
- **MongoDB Database:** NoSQL database for user data and preferences
- **Auth0 Integration:** Third-party authentication and authorization with JWT tokens

### High-Level System Diagram
```
+---------------------------------------+
|     Angular Frontend (SPA)            |
|   - Standalone Components             |
|   - Auth0 Angular SDK                 |
|   - HTTP Interceptors (JWT)           |
|   - Responsive UI                     |
+-------------------+-------------------+
                    | HTTP + JWT
                    v
+---------------------------------------+
|   Express.js API (Port 3000)          |
|   - Authentication (Auth0 JWT)        |
|   - Business Logic                    |
|   - Request Routing                   |
|   - CORS for Frontend                 |
+--------+-----------------+------------+
         |                 |
         v                 v
+-----------------+    +----------------------+
|   MongoDB       |    |  AWS Lambda Services |
|   - User Prefs  |    |  - Weather API       |
|   - File Meta   |    |  - MotoGP Data       |
+-----------------+    |  - F1 Data           |
                       |  - File Handler (S3) |
                       +----------------------+

Deployment Architecture:
+--------------+      +--------------+
|   Angular    |      |   Express    |
|  (Served on  |      |  (AWS ELB)   |
|   Port 4200) |      |  Port 3000   |
+--------------+      +--------------+
```

---

## 📚 Technology Stack

### Frontend Framework
- **Framework:** Angular 19.2.0 (latest)
- **Language:** TypeScript 5.7.2
- **Architecture:** Standalone Components (no NgModules)
- **State Management:** RxJS 7.8.0 (Observables)
- **Routing:** Angular Router with lazy loading
- **Forms:** Angular Reactive Forms
- **HTTP Client:** Angular HttpClient with interceptors
- **Auth:** @auth0/auth0-angular 2.3.0
- **Error Tracking:** @sentry/angular 10.27.0

### Frontend Build Tools
- **CLI:** Angular CLI 19.2.19
- **Build System:** Angular DevKit Build Angular
- **Testing:** Jasmine 5.6.0, Karma 6.4.0

### Backend Framework
- **Runtime:** Node.js 20 (Alpine Linux in production)
- **Language:** TypeScript 5.3.3
- **Framework:** Express.js 4.18.2
- **API Style:** RESTful API with JWT authentication
- **Error Tracking:** @sentry/node 10.27.0, @sentry/profiling-node 10.27.0

### Authentication & Security
- **Auth Provider:** Auth0 (OAuth2 JWT Bearer)
- **Frontend Auth:** @auth0/auth0-angular 2.3.0
- **Backend Auth:** express-oauth2-jwt-bearer 1.6.0
- **Middleware:** CORS enabled for cross-origin requests
- **HTTP Interceptor:** Automatic JWT token attachment

### Database
- **Primary Database:** MongoDB 6.3.0
- **Type:** NoSQL Document Database
- **Database Name:** `racing-dashboard`
- **Collections:** 
  - `preferences` - User preferences and settings

### Cloud Services
- **Cloud Provider:** AWS
- **Services Used:**
  - AWS Lambda (serverless functions)
  - AWS S3 (file storage - planned)
  - API Gateway (Lambda endpoints)
  - AWS ELB (Application Load Balancer for backend)
- **SDK:** aws-sdk 2.1498.0

### External APIs
- **Weather API:** WeatherAPI.com
- **Racing Data:** MotoGP API, F1 API (via Lambda functions)

### Development Tools

**Frontend:**
- **TypeScript:** Type safety
- **Angular CLI:** Project scaffolding and dev server
- **Karma/Jasmine:** Unit testing

**Backend:**
- **TypeScript:** Type safety
- **ts-node:** Development execution
- **nodemon:** Hot-reloading during development
- **ESLint:** Code linting
- **Jest:** Testing framework

### Deployment

**Frontend:**
- **Development:** `ng serve` (Port 4200)
- **Production:** Angular build with optimization
- **Deployment Target:** TBD (AWS S3 + CloudFront recommended)

**Backend:**
- **Containerization:** Docker
- **Base Image:** node:20-alpine
- **Build Tool:** TypeScript compiler (tsc)
- **Production Environment:** AWS ELB (Elastic Load Balancer)

---

## 📁 Project Structure

```
lets-go-racing/
|-- frontend/                   # Angular SPA Application
|   |-- src/
|   |   |-- app/
|   |   |   |-- pages/
|   |   |   |   |-- landing/            # Landing page component
|   |   |   |   |-- callback/           # Auth0 callback handler
|   |   |   |   |-- dashboard/          # Main dashboard (protected)
|   |   |   |   `-- preferences/        # User preferences (protected)
|   |   |   |-- app.component.ts        # Root component
|   |   |   |-- app.routes.ts           # Route configuration
|   |   |   |-- app.config.ts           # Application providers
|   |   |   `-- auth.config.ts          # Auth0 configuration
|   |   |-- environments/
|   |   |   |-- environment.ts          # Development config
|   |   |   `-- environment.prod.ts     # Production config
|   |   |-- main.ts                     # Bootstrap file
|   |   `-- index.html                  # HTML entry point
|   |-- public/                         # Static assets
|   |-- angular.json                    # Angular CLI configuration
|   |-- package.json                    # Frontend dependencies
|   `-- tsconfig.json                   # TypeScript configuration
|
|-- backend/                    # Express.js API server
|   |-- src/
|   |   |-- server.ts          # Main application entry point
|   |   |-- instrument.ts      # Sentry initialization (must be imported first)
|   |   |-- database.ts        # MongoDB service layer
|   |   `-- lambdaService.ts   # Lambda integration service
|   |-- package.json           # Backend dependencies
|   |-- tsconfig.json          # TypeScript configuration
|   `-- Dockerfile             # Docker build configuration
|
|-- lambdas/                   # Serverless Lambda functions
|   `-- weather/               # Weather data Lambda
|       |-- index.ts           # Lambda handler
|       |-- package.json       # Lambda dependencies
|       `-- tsconfig.json      # Lambda TypeScript config
|
`-- infra/                     # Infrastructure scripts
    `-- packageLambda.sh       # Lambda packaging script
```

### Key Directories Explained

**Frontend:**
- **src/app/pages/**: Page-level components (landing, dashboard, preferences, callback)
- **src/app/**: Application configuration, routing, and root component
- **src/environments/**: Environment-specific configuration
- **public/**: Static assets (images, icons, etc.)

**Backend:**
- **backend/src/**: Core application code for the Express API
- **lambdas/**: Independent Lambda functions for external integrations
- **infra/**: Infrastructure and deployment scripts

---

## 📌 API Architecture

### Base URL
- **Development:** `http://localhost:3000`
- **Production:** `https://api-home.thisisvillegas.com`

### Authentication
All `/api/*` endpoints require Auth0 JWT authentication, except:
- `/health` - Public health check endpoint

### API Endpoints

#### Health & Monitoring
```
GET /health
- No authentication required
- Returns: { status: 'ok', timestamp: ISO8601, version: string }
```

#### Race Data Endpoints
```
GET /api/races/upcoming
- Authentication: Required (JWT)
- Returns: { motogp: Race[], f1: Race[] }
- Description: Get upcoming races for the next 2 weeks from both MotoGP and F1
- Status: Currently returns mock data, Lambda integration pending
```

#### Weather Endpoints
```
GET /api/weather?lat={lat}&lon={lon}
GET /api/weather?city={city}
- Authentication: Required (JWT)
- Query Params:
  - lat, lon: Geographic coordinates
  - city: City name (alternative to coordinates)
- Returns: WeatherResponse object
- Description: Get current weather for a location via Weather Lambda
```

#### User Preferences Endpoints
```
GET /api/preferences
- Authentication: Required (JWT)
- Returns: UserPreferences object
- Description: Get current user's preferences
- Default: { favoriteTeams: [], notifications: true, theme: 'dark' }

PUT /api/preferences
- Authentication: Required (JWT)
- Body: { favoriteTeams?: string[], notifications?: boolean, theme?: string }
- Returns: { message: string, preferences: UserPreferences }
- Description: Update user preferences (upsert operation)
```

#### File Management Endpoints (Planned)
```
GET /api/files
- Authentication: Required (JWT)
- Returns: FileMetadata[]
- Description: Get user's uploaded files metadata
- Status: Mock implementation

POST /api/files/upload
- Authentication: Required (JWT)
- Body: File upload
- Returns: { message: string, fileId: string, url: string }
- Description: Upload file to S3 via Lambda
- Status: Planned

DELETE /api/files/:fileId
- Authentication: Required (JWT)
- Params: fileId
- Returns: { message: string }
- Description: Delete file from S3
- Status: Planned
```

### Error Responses
```
404: { error: 'Route not found' }
401: { error: 'Unauthorized' } or { error: 'User ID not found in token' }
500: { error: 'Internal server error' } or specific error message
```

---

## 🎨 Frontend Architecture

### Angular Application Structure

**Architecture Pattern:** Standalone Components (modern Angular approach)
- No NgModules required
- Direct component imports
- Lazy-loaded routes
- Simplified dependency injection

### Routing Structure

```typescript
/                    â†’ LandingComponent (public)
/callback            â†’ CallbackComponent (Auth0 callback)
/dashboard           â†’ DashboardComponent (protected - AuthGuard)
/preferences         â†’ PreferencesComponent (protected - AuthGuard)
/**                  â†’ Redirect to /
```

**Route Protection:**
- Auth0's `AuthGuard` protects `/dashboard` and `/preferences` routes
- Unauthenticated users redirected to Auth0 login
- After login, redirected to `/callback` then to intended route

### Component Architecture

#### LandingComponent
- **Purpose:** Public landing page
- **Features:** Login button, app introduction
- **Auth:** Not required

#### CallbackComponent
- **Purpose:** Handle Auth0 authentication callback
- **Features:** Token processing, redirect handling
- **Auth:** Processing authentication

#### DashboardComponent (Main App)
- **Purpose:** Main dashboard displaying races and weather
- **Features:**
  - Display upcoming MotoGP and F1 races
  - Show current weather based on user location
  - Navigation to preferences
  - Logout functionality
- **Data Sources:**
  - `GET /api/weather` - Weather data
  - `GET /api/races/upcoming` - Race schedule
- **Auth:** Protected by AuthGuard
- **Styling:** External template and SCSS stylesheet with purple gradient theme

#### PreferencesComponent
- **Purpose:** User settings management
- **Features:**
  - Add/remove favorite racing teams
  - Toggle race notifications
  - Select theme (light/dark)
  - Save preferences to backend
- **Data Sources:**
  - `GET /api/preferences` - Load user preferences
  - `PUT /api/preferences` - Save updated preferences
- **Auth:** Protected by AuthGuard
- **Forms:** Reactive forms with two-way binding

### State Management

**Approach:** RxJS Observables + Angular Services
- No global state management library (NgRx, Akita, etc.)
- Component-level state management
- HTTP calls return Observables
- Subscribe pattern for async data

### HTTP Communication

**Auth0 HTTP Interceptor:**
- Automatically attaches JWT token to all API requests
- Configured for specific endpoints:
  - `http://localhost:3000/api/*` (development)
  - `https://api-home.thisisvillegas.com/api/*` (production)
- Token includes Auth0 audience claim

**API Base URLs (Environment-based):**
- **Development:** `http://localhost:3000/api`
- **Production:** `https://api-home.thisisvillegas.com/api`

### Authentication Flow (Frontend)

```
1. User clicks "Login" on LandingComponent
   â†“
2. Auth0 Angular SDK redirects to Auth0 login page
   â†“
3. User authenticates with Auth0
   â†“
4. Auth0 redirects to /callback with authorization code
   â†“
5. CallbackComponent processes the code
   â†“
6. Auth0 SDK exchanges code for JWT token
   â†“
7. Token stored in memory (not localStorage)
   â†“
8. User redirected to /dashboard
   â†“
9. HTTP Interceptor attaches token to all API requests
```

### User Interface Design

**Design System:**
- **Color Palette:**
  - Primary: Purple gradient (#667eea â†’ #764ba2)
  - Success: Green (#48bb78)
  - Background: Light gray (#f5f7fa)
  - Cards: White with shadow
- **Typography:** System fonts, responsive sizing
- **Spacing:** Consistent padding/margins
- **Components:** Card-based layout

**Responsive Design:**
- Mobile-first approach
- Flexbox layouts
- Responsive grid for race cards
- Max-width containers (800px-1200px)

### Form Handling

**Approach:** Angular Forms Module (FormsModule)
- Two-way binding with `[(ngModel)]`
- Client-side validation
- Form submission handling
- Success/error feedback messages

**Example (Preferences):**
```typescript
<input [(ngModel)]="teamInput" name="teamInput" />
<button (click)="addTeam()">Add Team</button>
```

### Error Handling

**User Feedback:**
- Loading states ("Loading weather data...")
- Error states with user-friendly messages
- Success messages with auto-dismiss (3s timeout)
- Fallback content for missing data

**Error Scenarios:**
- API call failures â†’ Display error message
- Geolocation denied â†’ Fallback to default city (London)
- Failed authentication â†’ Redirect to login
- Invalid form data â†’ Client-side validation errors

### Performance Optimizations

**Lazy Loading:**
- All route components lazy-loaded
- Reduces initial bundle size
- Faster time-to-interactive

**Change Detection:**
- Default change detection strategy
- OnPush strategy could be added for optimization

**HTTP Caching:**
- No caching currently implemented
- Could add with interceptors

### Frontend Security

**Auth0 Security Features:**
- Secure token storage (in-memory, not localStorage)
- Automatic token refresh
- PKCE (Proof Key for Code Exchange)
- Authorization code flow with PKCE

**Protected Routes:**
- AuthGuard prevents unauthorized access
- Automatic redirect to login
- Token expiration handling

**CORS:**
- Backend CORS configured to allow frontend origin
- Credentials included in requests

---

## 💾 Data Models & Schema

### UserPreferences (MongoDB Collection: 'preferences')

```typescript
interface UserPreferences {
    userId: string;              // Auth0 user ID (from JWT sub claim)
    favoriteTeams?: string[];    // Array of favorite team IDs/names
    notifications?: boolean;      // Enable/disable notifications
    theme?: string;              // UI theme preference ('dark' | 'light')
    createdAt: Date;             // Document creation timestamp
    updatedAt: Date;             // Last update timestamp
}
```

**Indexes:**
- `userId` - Unique index for user lookups

**Operations:**
- `findOne({ userId })` - Get user preferences
- `findOneAndUpdate({ userId }, { $set: data, $setOnInsert: { createdAt } }, { upsert: true })` - Update preferences

### WeatherResponse (Lambda Response)

```typescript
interface WeatherResponse {
    location: string;        // "City, Country"
    temperature: number;     // Temperature in Celsius (rounded)
    feelsLike: number;      // Feels like temperature in Celsius
    condition: string;       // Weather condition text
    description: string;     // Detailed description
    humidity: number;        // Humidity percentage
    windSpeed: number;       // Wind speed in km/h (rounded)
    icon: string;           // Weather icon URL
}
```

### RaceData (Lambda Response)

```typescript
interface RaceData {
    motogp: any[];  // Array of MotoGP race objects
    f1: any[];      // Array of F1 race objects
}
```

### Database Relationships
- Single collection architecture currently
- User preferences are isolated per user (no relationships)
- Future: File metadata will reference userId

---

## 🔐 Security Implementation

### Authentication Flow

1. **Client Request** â†’ Includes JWT token in Authorization header
2. **JWT Middleware** (`auth()` from express-oauth2-jwt-bearer)
   - Validates token signature
   - Verifies issuer (Auth0)
   - Checks audience
   - Extracts user ID from `sub` claim
3. **Request Handler** â†’ Accesses user ID from `req.auth.payload.sub`
4. **Response** â†’ Returns data scoped to authenticated user

### Auth0 Configuration

Environment variables required:
```
AUTH0_AUDIENCE=<your-api-identifier>
AUTH0_ISSUER_BASE_URL=https://<your-tenant>.auth0.com
```

### Security Measures

- **CORS:** Enabled for cross-origin requests (configured in middleware)
- **JWT Validation:** All `/api/*` routes require valid JWT
- **Input Validation:** Query parameter validation in endpoints
- **Environment Variables:** Sensitive data stored in .env files
- **Lambda API Keys:** Lambda functions require x-api-key header
- **Rate Limiting:** Not yet implemented (recommended for production)

### Lambda Security

Each Lambda function validates:
1. **API Key:** Via `x-api-key` header
2. **Parameters:** Query parameter validation
3. **CORS:** Access-Control-Allow-Origin headers set

---

## 📊 Monitoring & Error Tracking

### Sentry Integration

The application uses **Sentry** for error tracking and performance monitoring on both frontend and backend.

#### Backend Sentry Setup

**File:** `backend/src/instrument.ts` (must be imported before other modules)

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
    dsn: '<your-sentry-dsn>',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],
    release: 'racing-dashboard-backend@1.0.0',
});
```

**Features:**
- Automatic error capture and reporting
- Performance tracing with configurable sample rates
- Node.js profiling integration
- Environment-aware configuration (dev vs prod)
- Express error handler middleware (`Sentry.setupExpressErrorHandler(app)`)

#### Frontend Sentry Setup

**File:** `frontend/src/app/app.config.ts`

```typescript
import * as Sentry from '@sentry/angular';

// In providers array:
{
    provide: ErrorHandler,
    useValue: Sentry.createErrorHandler({ showDialog: false }),
},
{
    provide: Sentry.TraceService,
    deps: [Router],
},
```

**Features:**
- Angular ErrorHandler integration
- Route change tracking via TraceService
- User context tracking (set in DashboardComponent)
- Test error endpoint for verification

#### User Context Tracking

The DashboardComponent sets user context in Sentry after authentication:

```typescript
Sentry.setUser({
    id: user.sub,
    email: user.email,
    username: user.name,
});
```

#### Test Endpoints

- **Backend:** `GET /api/test-error` - Throws a test error for Sentry verification
- **Frontend:** `testSentryError()` method in DashboardComponent

---

## 🔄 Service Integration Architecture

### Lambda Service Pattern

The application uses a centralized `LambdaService` class to manage all Lambda function calls:

```typescript
class LambdaService {
    getWeather(params)          // Weather Lambda
    getMotoGPRaces()            // MotoGP Lambda (planned)
    getF1Races()                // F1 Lambda (planned)
    getAllUpcomingRaces()       // Parallel execution of race Lambdas
    uploadFile()                // File upload Lambda (planned)
    deleteFile()                // File deletion Lambda (planned)
}
```

**Benefits:**
- Centralized error handling
- Consistent timeout management (10s for data, 30s for uploads)
- API key management
- Parallel execution support
- Easy to add new Lambda functions

### Database Service Pattern

Centralized `DatabaseService` class manages MongoDB operations:

```typescript
class DatabaseService {
    connect()                              // Initialize connection
    disconnect()                           // Close connection
    getUserPreferences(userId)             // Get user prefs
    updateUserPreferences(userId, data)    // Update/upsert prefs
}
```

**Singleton Pattern:** Exported as single instance (`databaseService`)

---

## 🧪 Testing Strategy

### Testing Frameworks
- **Unit Tests:** Jest 29.7.0
- **TypeScript Support:** ts-jest 29.1.1
- **Type Definitions:** @types/jest 29.5.11

### Test Coverage
- **Current Coverage:** Not yet implemented
- **Coverage Goals:** TBD

### Test Commands
```bash
npm test              # Run tests
npm run lint          # Run ESLint
```

---

## 🚀 Deployment Architecture

### Environment Configuration

#### Frontend Development
```bash
ng serve                # Start dev server on port 4200
# Auto-reload on file changes
# Uses environment.ts configuration
```
Environment: Development
API URL: `http://localhost:3000/api`

#### Frontend Production
```bash
ng build                # Build with optimizations
# Output: dist/ directory
# Minification, tree-shaking, AOT compilation
```
Environment: Production
API URL: `https://api-home.thisisvillegas.com/api`

#### Backend Development
```bash
npm run dev            # Start with nodemon + ts-node
```
Environment variables: `.env` file

#### Backend Production
```bash
npm run build          # Compile TypeScript
npm start              # Run compiled JavaScript
```
Environment variables: Container environment

### Docker Deployment (Backend)

**Dockerfile Strategy:**
1. Use Node.js 20 Alpine (minimal size)
2. Install dependencies (production only)
3. Copy TypeScript source
4. Compile TypeScript to JavaScript
5. Remove TypeScript source files
6. Expose port 3000
7. Run compiled server

**Multi-stage build:** Not used (could be optimized)

### Lambda Deployment

**Package Script:** `infra/packageLambda.sh`
- Packages Lambda functions for deployment
- Includes dependencies
- Creates deployment ZIP

### Frontend Deployment (Recommended)

**Option 1: AWS S3 + CloudFront**
1. Build production bundle: `ng build --configuration production`
2. Upload `dist/` to S3 bucket
3. Configure CloudFront distribution
4. Enable SPA routing (redirect all to index.html)

**Option 2: Netlify/Vercel**
- Connect GitHub repository
- Auto-deploy on push
- Built-in CDN and SSL

### Production Infrastructure

**Current Setup:**
- Backend: AWS ELB (Elastic Load Balancer) with custom domain
  - URL: `https://api-home.thisisvillegas.com`
- Lambda Functions: AWS Lambda + API Gateway
- Database: MongoDB Atlas (assumed)
- Frontend: Not yet deployed (development only)

### Environment Variables

**Frontend (environment.ts):**
```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api'
};
```

**Frontend (environment.prod.ts):**
```typescript
export const environment = {
    production: true,
    apiUrl: 'https://api-home.thisisvillegas.com/api'
};
```

**Frontend (auth.config.ts):**
```typescript
export const authConfig = {
    domain: 'dev-6sfjxompkc4vz884.us.auth0.com',
    clientId: '3cUknJuXEju8xlwS9RIP4t1SAxrdJfw4',
    authorizationParams: {
        redirect_uri: window.location.origin + '/callback',
        audience: 'https://api-home.thisisvillegas.com',
    },
    httpInterceptor: {
        allowedList: [
            {
                uri: 'http://localhost:3000/api/*',
                tokenOptions: {
                    authorizationParams: {
                        audience: 'https://api-home.thisisvillegas.com',
                    }
                }
            },
            {
                uri: 'https://api-home.thisisvillegas.com/api/*',
                tokenOptions: {
                    authorizationParams: {
                        audience: 'https://api-home.thisisvillegas.com',
                    }
                }
            }
        ]
    }
};
```

**Backend (.env):**
```bash
# Server
PORT=3000
NODE_ENV=production

# Auth0
AUTH0_AUDIENCE=https://api-home.thisisvillegas.com
AUTH0_ISSUER_BASE_URL=https://dev-6sfjxompkc4vz884.us.auth0.com

# Sentry
SENTRY_DSN=<your-sentry-dsn>

# MongoDB
MONGODB_URI=mongodb+srv://<connection-string>

# Lambda URLs & Keys
WEATHER_LAMBDA_URL=<api-gateway-url>
WEATHER_LAMBDA_API_KEY=<api-key>
MOTOGP_LAMBDA_URL=<api-gateway-url>
MOTOGP_LAMBDA_API_KEY=<api-key>
F1_LAMBDA_URL=<api-gateway-url>
F1_LAMBDA_API_KEY=<api-key>
FILE_HANDLER_LAMBDA_URL=<api-gateway-url>
FILE_HANDLER_LAMBDA_API_KEY=<api-key>
```

**Lambda (.env):**
```bash
API_KEY=<lambda-api-key>
WEATHER_API_KEY=<weatherapi-key>
```

---

## 📦 Dependencies

### 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @angular/core | ^19.2.0 | Core Angular framework |
| @angular/common | ^19.2.16 | Common Angular utilities |
| @angular/compiler | ^19.2.0 | Angular template compiler |
| @angular/forms | ^19.2.0 | Form handling |
| @angular/platform-browser | ^19.2.0 | Browser platform |
| @angular/platform-browser-dynamic | ^19.2.0 | Dynamic bootstrapping |
| @angular/router | ^19.2.0 | Routing and navigation |
| @auth0/auth0-angular | ^2.3.0 | Auth0 authentication |
| @sentry/angular | ^10.27.0 | Error tracking and monitoring |
| rxjs | ~7.8.0 | Reactive programming |
| tslib | ^2.3.0 | TypeScript runtime library |
| zone.js | ~0.15.0 | Angular zone.js |

### 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @angular/cli | ^19.2.19 | Angular CLI |
| @angular-devkit/build-angular | ^19.2.19 | Build tools |
| @angular/compiler-cli | ^19.2.0 | Template compiler |
| typescript | ~5.7.2 | TypeScript compiler |
| @types/jasmine | ~5.1.0 | Jasmine type definitions |
| jasmine-core | ~5.6.0 | Testing framework |
| karma | ~6.4.0 | Test runner |
| karma-chrome-launcher | ~3.2.0 | Chrome for testing |
| karma-coverage | ~2.2.0 | Code coverage |
| karma-jasmine | ~5.1.0 | Jasmine adapter |
| karma-jasmine-html-reporter | ~2.1.0 | HTML test reporter |

### 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| @sentry/node | ^10.27.0 | Error tracking and monitoring |
| @sentry/profiling-node | ^10.27.0 | Performance profiling |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.3.1 | Environment variable management |
| express-oauth2-jwt-bearer | ^1.6.0 | Auth0 JWT authentication |
| mongodb | ^6.3.0 | MongoDB driver |
| axios | ^1.6.2 | HTTP client for Lambda calls |
| aws-sdk | ^2.1498.0 | AWS service integration |

### 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @types/express | ^4.17.21 | TypeScript types |
| @types/cors | ^2.8.17 | TypeScript types |
| @types/node | ^20.10.4 | TypeScript types |
| typescript | ^5.3.3 | TypeScript compiler |
| ts-node | ^10.9.2 | TypeScript execution |
| nodemon | ^3.0.2 | Development hot-reload |
| @typescript-eslint/eslint-plugin | ^6.13.2 | Linting |
| @typescript-eslint/parser | ^6.13.2 | Linting |
| eslint | ^8.55.0 | Code linting |
| jest | ^29.7.0 | Testing framework |
| @types/jest | ^29.5.11 | TypeScript types |
| ts-jest | ^29.1.1 | Jest TypeScript support |

### 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | Latest | HTTP client for WeatherAPI |

---

## 🎯 Design Patterns & Principles

### Patterns Implemented

1. **Service Layer Pattern**
   - `DatabaseService`: Abstracts MongoDB operations
   - `LambdaService`: Abstracts Lambda function calls
   - Benefits: Separation of concerns, testability, reusability

2. **Singleton Pattern**
   - Both service classes exported as singleton instances
   - Ensures single database connection pool
   - Consistent Lambda configuration

3. **Middleware Pattern**
   - Express.js middleware for CORS, JSON parsing, authentication
   - Modular request processing pipeline

4. **Factory Pattern (Implicit)**
   - MongoDB collection getters (`getPreferencesCollection()`)
   - Ensures type safety and consistency

5. **Error Handling Pattern**
   - Centralized error handlers in Express
   - Try-catch blocks with specific error responses
   - Lambda error transformation

### Code Organization Principles

- **TypeScript First:** Strong typing throughout
- **Async/Await:** Modern asynchronous code patterns
- **Environment Configuration:** 12-factor app methodology
- **RESTful Design:** Standard HTTP methods and status codes
- **Separation of Concerns:** Clear module boundaries

---

## 🔄 Key Workflows & Business Logic

### User Authentication Flow

```
1. Client obtains JWT from Auth0
2. Client includes JWT in Authorization header
3. Express middleware validates JWT
4. Extract user ID from token (req.auth.payload.sub)
5. Use user ID for all database operations
6. Return user-scoped data
```

### Weather Data Flow

```
1. Client requests weather with location
2. Express validates JWT
3. Extract lat/lon or city from query params
4. Call LambdaService.getWeather()
5. Lambda validates API key
6. Lambda calls WeatherAPI.com
7. Lambda transforms response
8. Return weather data to client
```

### Preferences Update Flow

```
1. Client sends PUT /api/preferences with data
2. Express validates JWT
3. Extract user ID from token
4. Call DatabaseService.updateUserPreferences()
5. MongoDB upsert operation:
   - Update if exists
   - Create if doesn't exist
   - Set updatedAt timestamp
   - Set createdAt on first insert
6. Return updated preferences
```

### Upcoming Races Flow (Planned)

```
1. Client requests upcoming races
2. Express validates JWT
3. Call LambdaService.getAllUpcomingRaces()
4. Execute MotoGP and F1 Lambdas in parallel (Promise.all)
5. Combine results
6. Return { motogp: [], f1: [] }
```

---

## 🌐 Integration Points

### External APIs

| Service | Purpose | Endpoint | Auth Method | Implementation |
|---------|---------|----------|-------------|----------------|
| Auth0 | Authentication | auth0.com | OAuth2 JWT | express-oauth2-jwt-bearer |
| WeatherAPI | Weather data | weatherapi.com | API Key | Via Lambda |
| MotoGP API | Race data | TBD | TBD | Planned |
| F1 API | Race data | TBD | TBD | Planned |
| AWS Lambda | Serverless compute | API Gateway | x-api-key | axios HTTP calls |
| MongoDB Atlas | Database | Cloud | Connection string | MongoDB driver |

### Lambda Function Endpoints

| Function | URL Env Var | Key Env Var | Purpose |
|----------|-------------|-------------|---------|
| Weather | WEATHER_LAMBDA_URL | WEATHER_LAMBDA_API_KEY | Get weather data |
| MotoGP | MOTOGP_LAMBDA_URL | MOTOGP_LAMBDA_API_KEY | Get MotoGP races |
| F1 | F1_LAMBDA_URL | F1_LAMBDA_API_KEY | Get F1 races |
| File Handler | FILE_HANDLER_LAMBDA_URL | FILE_HANDLER_LAMBDA_API_KEY | S3 file operations |

---

## 📊 Performance Considerations

### Optimization Strategies

- **Lambda Parallel Execution:** Race data fetched concurrently
- **MongoDB Upsert:** Single operation for update/insert
- **Database Connection Pooling:** MongoDB driver handles automatically
- **Docker Alpine Image:** Smaller image size, faster deployments
- **TypeScript Compilation:** Production builds use compiled JavaScript
- **Timeout Configuration:** 10s for data calls, 30s for file uploads

### Current Limitations

- No caching layer (Redis recommended for production)
- No database indexing documented (only userId)
- No request rate limiting
- No CDN for static assets
- No health check for dependencies (MongoDB, Lambdas)

### Recommended Improvements

1. Add Redis for caching race schedules
2. Implement rate limiting (express-rate-limit)
3. Add database indexes for common queries
4. Implement comprehensive health checks
5. Add request/response compression
6. Implement connection retry logic
7. Add circuit breaker for Lambda calls

---

## 🐛 Known Issues & Technical Debt

### Current Issues

1. **Mock Data:** Race endpoints return mock data instead of real Lambda calls
2. **File Upload:** File upload endpoints not yet implemented
3. **Error Messages:** Some generic error messages need improvement
4. **Typo:** Line 21 in server.ts - "COnnect" should be "Connect"

### Technical Debt

1. **Testing:** No tests implemented yet
2. **Validation:** No request body validation (consider using Joi or Zod)
3. **Logging:** Basic console.log, needs structured logging (Winston/Pino)
4. **API Documentation:** No OpenAPI/Swagger documentation
5. **Database Migrations:** No migration strategy for schema changes
6. **Secrets Management:** API keys in environment variables (consider AWS Secrets Manager)

---

## 📈 Recent Changes & Decisions Log

### 2025-12-07 - Version 2.1 - Documentation Update & Sentry Integration

#### What Changed:
- **Sentry Integration Documented:** Added comprehensive documentation for Sentry error tracking on both frontend and backend
- **Production URL Updated:** Changed from AWS ELB URL to custom domain `https://api-home.thisisvillegas.com`
- **Auth0 Configuration Updated:** Corrected clientId and audience values to match actual implementation
- **Project Structure Updated:** Added `instrument.ts` to backend source files
- **Dashboard Component:** Corrected description to note external templates/SCSS (not inline)
- **Dependencies Updated:** Added Sentry packages to dependency tables

#### Key Additions:
- New "Monitoring & Error Tracking" section
- Sentry setup examples for frontend and backend
- User context tracking documentation
- Test error endpoints documentation

---

### 2024-11-30 - Version 2.0 - Frontend Added

#### Major Addition: Angular Frontend

**What Changed:**
- Added complete Angular 19 frontend application
- Implemented 4 main pages: Landing, Callback, Dashboard, Preferences
- Integrated Auth0 authentication with Angular SDK
- Connected frontend to existing backend API
- Deployed backend to AWS ELB

#### New Components

1. **LandingComponent** - Public landing page
2. **CallbackComponent** - Auth0 authentication callback handler
3. **DashboardComponent** - Main app showing races and weather
4. **PreferencesComponent** - User settings management

#### Key Decisions Made

1. **Angular 19 with Standalone Components**
   - **Rationale:** Modern Angular approach, simpler than NgModules
   - **Benefit:** Reduced boilerplate, better tree-shaking
   - **Trade-off:** Newer pattern, less mature than NgModule approach

2. **Inline Templates & Styles**
   - **Rationale:** Keep component logic together for small components
   - **Benefit:** Easier to understand and maintain
   - **Trade-off:** Could become unwieldy for larger components

3. **No Global State Management**
   - **Rationale:** Simple app doesn't need NgRx/Akita yet
   - **Benefit:** Less complexity, faster development
   - **When to Revisit:** If app grows beyond 10-15 components

4. **Auth0 Angular SDK**
   - **Rationale:** Official SDK with automatic token management
   - **Benefit:** Secure, well-maintained, automatic refresh
   - **Alternative Considered:** Manual JWT handling (too complex)

5. **Environment-based Configuration**
   - **Rationale:** Different API URLs for dev vs prod
   - **Benefit:** Easy switching between environments
   - **Implementation:** environment.ts files

6. **AWS ELB for Backend**
   - **Rationale:** Scalable, managed load balancing
   - **Benefit:** No server management, auto-scaling
   - **Current URL:** `https://api-home.thisisvillegas.com` (custom domain)

#### 🎨 Frontend Architecture Highlights

- **Pattern:** Single Page Application (SPA)
- **Routing:** Lazy-loaded routes with AuthGuard protection
- **Forms:** Angular FormsModule with two-way binding
- **HTTP:** Interceptors for automatic JWT attachment
- **Styling:** Purple gradient theme, card-based layout
- **Responsive:** Mobile-first design approach

#### 🌐 Integration Points

- Frontend â†’ Backend: HTTP calls with JWT tokens
- Auth0: Complete authentication flow implemented
- Geolocation API: Used for weather feature
- Route Guards: Protect dashboard and preferences pages

---

### 2024-11-30 - Version 1.0 - Initial Architecture Documentation

#### Key Decisions Made

1. **Hybrid Architecture:** Express backend + AWS Lambda for external integrations
   - **Rationale:** Lambda provides cost-effective, scalable solution for API integrations
   - **Trade-off:** Additional complexity vs. cost savings and scalability

2. **MongoDB as Database:** NoSQL document database
   - **Rationale:** Flexible schema, good for user preferences
   - **Alternative Considered:** PostgreSQL (more structure, but less flexible)

3. **Auth0 for Authentication:** Third-party auth provider
   - **Rationale:** Avoid building auth from scratch, industry-standard OAuth2/JWT
   - **Trade-off:** External dependency vs. security and features

4. **TypeScript Throughout:** Type-safe codebase
   - **Rationale:** Better developer experience, catch errors at compile time
   - **Cost:** Slightly more verbose, build step required

5. **WeatherAPI.com:** Weather data provider
   - **Rationale:** Free tier available, good documentation
   - **Alternative:** OpenWeatherMap (also viable)

#### Architecture Highlights

- Service layer pattern for clean separation
- Centralized Lambda integration
- Singleton database service
- Docker-ready deployment
- JWT authentication on all API routes

---

## 🎓 Development Guidelines

### Adding New API Endpoints

1. Add route handler in `server.ts`
2. Use JWT middleware for protected routes
3. Extract user ID from `req.auth.payload.sub`
4. Call appropriate service (database or Lambda)
5. Handle errors with try-catch
6. Return appropriate HTTP status codes

### Adding New Lambda Functions

1. Create new directory in `lambdas/`
2. Implement handler function with proper types
3. Add Lambda integration method to `LambdaService`
4. Add environment variables for URL and API key
5. Call from Express route handler
6. Handle errors appropriately

### Database Operations

1. Add new methods to `DatabaseService` class
2. Define TypeScript interfaces for data models
3. Use MongoDB's `findOneAndUpdate` for upserts
4. Always include timestamps (createdAt, updatedAt)
5. Export singleton instance

---

## 📝 Notes & Additional Context

### Project Context

This is a **racing dashboard application** that provides:
- Upcoming race schedules (MotoGP + F1)
- Weather information for user's location
- User preference management
- File upload/download capabilities (planned)

### Target Users

- Racing fans who follow MotoGP and/or F1
- Users who want personalized racing content
- Mobile and web application users

### Future Enhancements Planned

1. Complete Lambda implementations for MotoGP and F1 data
2. Implement file upload/download functionality
3. Add caching layer for race schedules
4. Real-time race updates (WebSockets?)
5. Push notifications for favorite teams
6. Historical race data and statistics
7. Social features (sharing, comments)

### Development Practices

- Use TypeScript for all new code
- Write tests for critical paths
- Document environment variables
- Follow RESTful conventions
- Keep Lambdas focused and single-purpose

---

**Document Maintenance Instructions:**

This document should be updated when:
1. New features are added
2. Architecture decisions are made
3. Dependencies are updated
4. APIs change
5. Security measures are implemented
6. Performance optimizations are made

To update: Provide changes to Claude and say "Update the architecture documentation"

---

**Created:** 2024-11-30
**Last Updated:** 2025-12-07
**Author:** Automated analysis + manual enhancement
**Project:** Let's Go Racing