# Cognition Digest Backend

AI-powered content summarization service with Google OAuth authentication, email delivery, and async task processing.

## Features

- ✅ **Google OAuth 2.0** - Secure user authentication
- ✅ **Video Digest Generation** - YouTube, Podcast, Article summarization
- ✅ **Email Delivery** - SendGrid integration with beautiful HTML templates
- ✅ **PostgreSQL Database** - Optional persistent storage (uses in-memory if not configured)
- ✅ **RESTful API** - Fastify + TypeScript
- ✅ **API Documentation** - OpenAPI 3.0 + Swagger UI

## Project Structure

```
.
├── openapi/
│   └── openapi.yaml
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── types/
│   │   └── report.ts
│   ├── repo/
│   │   └── reportRepo.ts
│   ├── plugins/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   └── routes/
│       └── report.ts
├── tests/
│   └── report.test.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Auth Contract

- Bearer token: `Authorization: Bearer <token>`
- Or cookie: `digest-token=<token>`
- Tokens come from `DIGEST_TOKEN` env var (comma-separated list supported). Must mirror the frontend `DIGEST_TOKEN`.

## Endpoints

- `GET /api/report/:id`
  - 200: `{ id, report|null, message }`
  - 401: `{ message: "Unauthorized" }`
- `POST /api/report/:id`
  - Body: `{ title?, createdAt? }` (no additional properties)
  - 200: `{ id, ok: true, message }`
  - 400/401 on errors

Docs: `GET /docs` (Swagger UI) and raw spec at `GET /openapi.yaml`.

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)
- Or: PostgreSQL 16+ and Redis 7+

### 2. Clone and Install

```bash
git clone <repository-url>
cd Cognition-Digest_backend
npm install
```

### 3. Start Database & Redis

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or install PostgreSQL and Redis locally
# See docs/database-setup.md
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cognition_digest
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-long-random-secret

# Google OAuth (optional, for login)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# SendGrid (optional, for email)
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

### 5. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 6. Start Development Server

```bash
npm run dev
```

Server will start at:
- **API**: http://localhost:4000
- **Docs**: http://localhost:4000/docs
- **OpenAPI**: http://localhost:4000/openapi.yaml

## Build & Start

```bash
npm run build
npm start
```

## Testing

```bash
# Uses vitest + supertest
npm test
```

## Implementation Notes

- `src/plugins/auth.ts`: global `preHandler` allowing either bearer header or `digest-token` cookie and validating against `DIGEST_TOKEN`.
- `src/plugins/errorHandler.ts`: standard JSON error shape `{ message }`.
- `src/repo/reportRepo.ts`: in-memory `Map` as a placeholder for persistence.
- `src/routes/report.ts`: fulfills the OpenAPI shapes and applies basic validation for ISO-8601 timestamps and `additionalProperties: false`.
- `src/app.ts`: wires middleware, routes, and serves OpenAPI + Swagger UI via CDN.

## API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Reports (New API)

- `POST /api/reports` - Create digest report
- `GET /api/reports/:id` - Get report by ID

### Testing

- `POST /api/test/email` - Send test email

### Public

- `GET /healthz` - Health check
- `GET /docs` - Swagger UI
- `GET /openapi.yaml` - OpenAPI spec

## Documentation

- **[API Examples](docs/api-examples.md)** - Complete API usage guide
- **[Frontend Integration](docs/frontend-integration.md)** - React/Vue integration
- **[Google OAuth Setup](docs/google-oauth-setup.md)** - OAuth configuration
- **[SendGrid Setup](docs/sendgrid-setup.md)** - Email service setup
- **[Database Setup](docs/database-setup-simple.md)** - PostgreSQL setup (optional)

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 5
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 (optional, uses in-memory storage if not configured)
- **Auth**: Google OAuth 2.0 + JWT
- **Email**: SendGrid
- **Testing**: Vitest + Supertest

## Project Structure

```
.
├── docs/                    # Documentation
│   ├── api-examples.md
│   ├── frontend-integration.md
│   ├── google-oauth-setup.md
│   ├── sendgrid-setup.md
│   └── database-setup-simple.md
├── examples/                # Frontend examples
├── openapi/                 # OpenAPI spec
├── sql/                     # Database schema (PostgreSQL)
├── scripts/                 # Setup scripts
├── src/
│   ├── lib/                 # Database client (pg)
│   ├── plugins/             # Fastify plugins
│   ├── routes/              # API routes
│   ├── services/            # Business logic (email, etc.)
│   ├── types/               # TypeScript types
│   ├── repo/                # Data repositories
│   ├── app.ts               # App setup
│   └── server.ts            # Server entry
├── tests/                   # Test files
├── docker-compose.yml       # PostgreSQL for local dev
└── package.json
```

## Environment Variables

See `.env.example` for all available options.

**Required**:
- `SESSION_SECRET` - JWT signing secret

**Optional**:
- `DATABASE_URL` - PostgreSQL connection (uses in-memory if not set)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For OAuth
- `SENDGRID_API_KEY` - For email delivery
- `FRONTEND_URL` - For CORS

## Development

```bash
# Start database (optional)
docker-compose up -d
npm run db:setup

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Production Deployment

```bash
# Build
npm run build

# Setup database (if using PostgreSQL)
npm run db:setup

# Start
npm start
```

## License

MIT
