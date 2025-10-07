# Google OAuth Setup Guide

## Overview

This backend supports Google OAuth 2.0 login via the authorization code flow. Users can log in through Google, and the backend issues a session JWT cookie for subsequent authenticated requests.

## Setup Steps

### 1. Create Google Cloud OAuth 2.0 Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth client ID**
4. Choose **Web application**
5. Configure:
   - **Name**: Your app name (e.g., "Cognition Digest Backend")
   - **Authorized redirect URIs**: Add your callback URL
     - Development: `http://localhost:4000/auth/google/callback`
     - Production: `https://your-domain.com/auth/google/callback`
6. Save and copy:
   - **Client ID**
   - **Client Secret**

### 2. Configure Environment Variables

Create or update `.env` in the project root:

```bash
# Google OAuth (required for login)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Public base URL (used to build callback URL)
BASE_URL=http://localhost:4000

# Session signing secret (generate a long random string)
SESSION_SECRET=your-long-random-secret-here

# Legacy token auth (optional, for backward compatibility)
DIGEST_TOKEN=dev-token-1,dev-token-2

# Server port
PORT=4000
```

**Security Notes:**
- Never commit `.env` to version control
- Use a strong random string for `SESSION_SECRET` (e.g., 64+ characters)
- Keep `GOOGLE_CLIENT_SECRET` confidential

### 3. Generate a Strong Session Secret

```bash
# macOS/Linux
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Authentication Flow

### Google OAuth Login

1. **Initiate Login**: User visits `/auth/google`
   - Backend redirects to Google's authorization page
   - User grants permissions (email, profile)

2. **Callback**: Google redirects to `/auth/google/callback?code=...`
   - Backend exchanges authorization code for access token
   - Fetches user profile from Google
   - Issues a session JWT cookie (7-day expiry)
   - Redirects to home page or specified `?redirect=` URL

3. **Authenticated Requests**: Subsequent API calls
   - Session cookie is automatically sent by browser
   - Backend validates JWT signature and expiration
   - User is authorized

### Legacy Token Auth (Fallback)

For backward compatibility, the backend still supports Bearer token authentication:

```bash
curl -H "Authorization: Bearer dev-token-1" \
  http://localhost:4000/api/report/r-1
```

## API Endpoints

### Authentication

- **`GET /auth/google`** - Initiate Google OAuth login
  - Redirects to Google authorization page
  - Optional query param: `?redirect=/path` (where to redirect after login)

- **`GET /auth/google/callback`** - OAuth callback (handled automatically)
  - Exchanges code for token
  - Sets session cookie
  - Redirects to home or specified path

- **`POST /auth/logout`** - Logout
  - Clears session cookie
  - Returns: `{ "ok": true }`

### Protected Routes

All routes under `/api/*` require authentication (session cookie or Bearer token):

- **`GET /api/report/:id`** - Get report by ID
- **`POST /api/report/:id`** - Create/update report

### Public Routes

- **`GET /healthz`** - Health check
- **`GET /docs`** - API documentation (Swagger UI)
- **`GET /openapi.yaml`** - OpenAPI specification

## Testing

### Manual Testing

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:4000/auth/google` in your browser

3. Complete Google login

4. You should be redirected with a session cookie set

5. Test protected endpoint:
   ```bash
   curl -b cookies.txt http://localhost:4000/api/report/test-1
   ```

### Automated Tests

Tests use the legacy `DIGEST_TOKEN` for simplicity:

```bash
npm test
```

## Session Management

- **Cookie Name**: `session`
- **Expiry**: 7 days
- **Storage**: JWT (signed with `SESSION_SECRET`)
- **Payload**: `{ sub, email, name, picture, provider }`
- **Security**: `httpOnly`, `sameSite: lax`, `secure` (in production)

## Troubleshooting

### "Google OAuth not configured" warning

- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the server after updating `.env`

### "Unauthorized" on protected routes

- Check that session cookie is present (browser DevTools → Application → Cookies)
- Verify `SESSION_SECRET` is set and matches the one used to sign the cookie
- Check cookie expiration (7 days from login)

### Redirect URI mismatch

- Ensure the callback URI in Google Cloud Console exactly matches:
  - `{BASE_URL}/auth/google/callback`
- Check for trailing slashes and http vs https

### Session cookie not set

- Check browser console for errors
- Verify `SESSION_SECRET` is configured
- Check that `/auth/google/callback` completes successfully

## Production Deployment

1. Update `BASE_URL` to your production domain:
   ```bash
   BASE_URL=https://api.yourdomain.com
   ```

2. Add production callback URI to Google Cloud Console:
   ```
   https://api.yourdomain.com/auth/google/callback
   ```

3. Set `NODE_ENV=production` to enable secure cookies:
   ```bash
   NODE_ENV=production
   ```

4. Use a strong, unique `SESSION_SECRET` (different from dev)

5. Consider using a secrets manager (AWS Secrets Manager, Google Secret Manager, etc.)

## Architecture

- **Auth Plugin** (`src/plugins/auth.ts`): Global preHandler hook that validates session/token
- **Auth Routes** (`src/routes/auth.ts`): Google OAuth endpoints and logout
- **Session Cookie**: JWT signed with `SESSION_SECRET`, verified on each request
- **Fallback**: Legacy `DIGEST_TOKEN` Bearer auth for backward compatibility
