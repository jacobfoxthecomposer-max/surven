# Surven Extension API Keys — Premium-Only Access

## Overview

The Surven Chrome Extension is now **premium-only**. Users need to generate an individual API key in the dashboard and paste it into the extension settings.

## How It Works

### For Premium Users

1. **Generate API Key**
   - Go to Dashboard → Settings → API Keys
   - Click "Generate API Key"
   - Save the key (shown only once)

2. **Add Key to Extension**
   - Open the Surven Auditor extension
   - Click the Settings icon (⚙️) in the top-right
   - Paste the API key into the "API Key" field
   - API URL should be: `https://surven.vercel.app/api/audit/run`
   - Click "Save"

3. **Start Auditing**
   - Navigate to any website in your browser
   - Open the Surven Auditor extension
   - Click "Run Audit"

### For Free Users

- See a message in the API Keys settings tab
- Prompted to upgrade to premium

## Technical Architecture

### Database
- **Table**: `extension_api_keys`
  - Stores per-user API keys
  - Keys are prefixed with `sv_ext_` for easy identification
  - Revoked keys are soft-deleted with `revoked_at` timestamp

### API Endpoints

**Generate API Key** `POST /api/generate-extension-key`
- Requires authentication (Bearer token)
- Requires premium plan
- Returns: `{ apiKey: "sv_ext_..." }`

**Audit Endpoint** `POST /api/audit/run`
- Validates API key in `x-api-key` header
- Returns 403 if user is not premium
- Returns 401 if key is invalid

### RPC Functions (Supabase)
- `generate_api_key()` — Creates random key with `sv_ext_` prefix
- `create_extension_api_key(p_user_id, p_key_name)` — Creates key for premium user
- `validate_extension_api_key(p_key)` — Checks key validity and plan

## Security

- API keys are unique and cannot be guessed
- Keys are validated against the database on every audit request
- Only premium/admin users can generate keys
- Keys are stored in Supabase with RLS policies
- Extension never stores credentials in environment variables

## Migration Steps

Run the SQL migration in Supabase:

1. Copy contents of `supabase/extension_api_keys_migration.sql`
2. Go to Supabase dashboard → SQL Editor
3. Paste and execute
4. Deploy the app to Vercel

## Testing

```bash
# Test generating a key
curl -X POST http://localhost:3000/api/generate-extension-key \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}'

# Test audit with key
curl -X POST http://localhost:3000/api/audit/run \
  -H "x-api-key: sv_ext_..." \
  -H "Content-Type: application/json" \
  -d '{"siteUrl": "https://example.com"}'
```
