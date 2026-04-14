# Research: Neon, Resend, and Better Auth Integration with Vercel

**Date:** 2026-03-23
**Scope:** Neon Postgres, Resend email, Better Auth authentication on Vercel
**Focus:** Environment variables, connection patterns, password hashing

---

## 1. Neon Postgres + Vercel Integration

### Marketplace Integration
- Vercel Marketplace integration fully managed by Neon (transitioned Q4 2024 - Q1 2025)
- Automatically provisions Neon database on project connection
- Creates database branches for each preview deployment

### Environment Variables Provided
The integration sets **both modern and legacy** variables:

**Modern (Recommended):**
- `DATABASE_URL` - pooled connection (PgBouncer managed)
- `DATABASE_URL_UNPOOLED` - direct connection to Postgres

**Legacy PostgreSQL variables:**
- `POSTGRES_URL` - aliased to pooled connection
- `PGHOST` - pooled connection endpoint
- `PGHOST_UNPOOLED` - direct connection endpoint
- Standard: `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`

### Pooled vs Direct Connections

**Pooled Connections (DATABASE_URL):**
- Routes through PgBouncer connection pool
- **Recommended default** for serverless workloads
- Handles up to 10,000 concurrent client connections
- Ideal for high-concurrency applications
- Pooled string format: `postgresql://user:pass@....-pooler.region.aws.neon.tech/db?sslmode=require&channel_binding=require`

**Direct Connections (DATABASE_URL_UNPOOLED):**
- Direct TCP connection to Postgres (no pooling layer)
- Use for: schema migrations, long-lived connections, features PgBouncer doesn't support
- Required for tools like Prisma Migrate (use as `directUrl`)
- Direct string format: `postgresql://user:pass@....region.aws.neon.tech/db?sslmode=require`

### @neondatabase/serverless Driver

For serverless functions with Neon driver:

**Transport Protocols:**
- **HTTP** - faster for single queries (~3 round trips), supports non-interactive transactions
- **WebSocket** - persistent connection within request, supports interactive transactions & pg compatibility

**Vercel Compute Recommendation:**
- **Vercel Fluid Compute (NEW):** Use standard PostgreSQL with connection pooling (recommended, fastest)
- **Traditional serverless:** Use `@neondatabase/serverless` driver with pooled DATABASE_URL

### Connection Pooling
- Neon manages PgBouncer internally on pooled URLs
- Subsequent queries after cold-start typically complete in **sub-100ms** for simple operations
- Verify pooled URL in Neon Dashboard: select "Pooled connection"

---

## 2. Resend Email + Vercel Integration

### Marketplace Integration
- Vercel Integration simplifies API key management and domain provisioning
- Automatically adds environment variables to projects
- Integrates directly with Vercel Dashboard

### Environment Variables
- `RESEND_API_KEY` - primary API key provisioned by integration
- Key is created with specific domain association
- Can create additional keys via Resend Dashboard

### API Key Permissions

**Permission Levels:**
1. **full_access** - Can create, delete, get, and update any resource (NOT recommended for apps)
2. **sending_access** - Can only send emails (RECOMMENDED)

**Domain Restriction:**
- Restrict `sending_access` key to specific verified domain via `domain_id`
- Each restricted key can only dispatch from its assigned domain
- Improves security by limiting key scope

### Domain Verification

**Best Practice:**
- Use subdomain (e.g., `updates.example.com`) instead of root domain
- Allows reputation segmentation
- Important if receiving emails with Resend

**Verification Methods:**
1. **Auto Configure (Fastest)** - Uses Domain Connect for automatic DNS setup
2. **Manual** - Add MX and TXT records to Vercel DNS

**Timeline:**
- Verification often **completes within hours** (sometimes minutes)
- DNS propagation up to 48 hours
- Verify with DNS lookup tools if issues occur

**For Testing:**
- Resend provides `onboarding@resend.dev` for testing without domain verification
- Useful for development but not production use

### Key Setup Workflow
1. Install Resend integration from Vercel Marketplace
2. Select Vercel team and project(s)
3. Integration automatically provisions `RESEND_API_KEY`
4. Create additional API keys in Resend Dashboard with:
   - Permission: `sending_access` (not full_access)
   - Domain restriction (if needed)
   - Add to Vercel env vars manually

---

## 3. Better Auth with Neon Postgres

### Recommended Setup Pattern

**Database Connection:**
- Use `DATABASE_URL` (pooled) for Better Auth
- Better Auth works with pooled connections on serverless
- Pooled connections are sufficient for typical auth workloads

**ORM Integration:**
- Use **Drizzle ORM** as the primary adapter
- Better Auth provides official Drizzle adapter
- Configure with standard Postgres provider: `const db = drizzle(sql)`

**Neon Auth (2025+):**
- Neon now provides built-in Neon Auth (built on Better Auth)
- Automatically configures database schema and env vars when Vercel project connects to Neon
- Simplifies setup: Better Auth config is pre-initialized

### Neon + Better Auth + Drizzle Pattern (Vercel Serverless)

```typescript
// Use DATABASE_URL (pooled) for serverless
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { betterAuth } from 'better-auth';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const auth = betterAuth({
  database: db,
  // ... rest of config
});
```

### Environment Variables (Neon Auth)
- Automatically set when Vercel project links to Neon database
- No manual configuration needed
- Includes DATABASE_URL, auth schema, and related settings

---

## 4. Password Hashing in Better Auth v1.x

### Default Algorithm: Scrypt
- **Algorithm:** Scrypt (memory-hard, CPU-intensive)
- **Why Scrypt:** Natively supported by Node.js, OWASP recommended
- **Resistance:** Memory-hard design resists hardware brute-force attacks

### Storage Details
- **Location:** `account` table (not `user` table)
- **Provider ID:** Stored with `providerId = "credential"`
- **Format:** Scrypt hash format (exact format not publicly documented in Better Auth docs)
- No "oslo" format specified - oslo is a separate library for custom algorithms

### Password Verification
- Custom `hash()` and `verify()` functions can override defaults
- Example: Use `@node-rs/argon2` for Argon2 instead of scrypt
- Configuration through `password` option in emailAndPassword provider

### Oslo Library Integration
- **Not default** - oslo provides *optional* password hashing methods
- Supports Argon2id, Scrypt, Bcrypt via oslo library
- Can be integrated via Better Auth's custom password interface
- Example: `oslo.password.Argon2id()` for Argon2 hashing

### Customization Example
```typescript
const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => {
        // Custom hashing logic
      },
      verify: async (password, hash) => {
        // Custom verification logic
      },
    },
  },
});
```

---

## Summary: Recommended Architecture for Vercel

### Database (Neon)
```
Vercel Function → DATABASE_URL (pooled) → Neon PgBouncer → Postgres
                    (for app queries)

Schema Migrations → DATABASE_URL_UNPOOLED → Direct Postgres
                    (build/deploy phase)
```

### Email (Resend)
```
Environment: RESEND_API_KEY (sending_access restricted to domain)
Domain: Verified custom subdomain (updates.example.com recommended)
Key Permissions: sending_access only (not full_access)
```

### Auth (Better Auth + Neon)
```
Vercel Function → DATABASE_URL (pooled) → Neon → Postgres (account table)
Better Auth: Drizzle adapter
Password Hash: Scrypt (default), stored in account table with credential providerId
```

---

## Sources

**Neon Documentation:**
- [Neon-Managed Vercel Integration](https://neon.com/docs/guides/neon-managed-vercel-integration)
- [Connecting from Vercel - Connection Methods](https://neon.com/docs/guides/vercel-connection-methods)
- [Connection Pooling Guide](https://neon.com/docs/connect/connection-pooling)
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver)
- [Drizzle with Neon](https://orm.drizzle.team/docs/connect-neon)

**Resend Documentation:**
- [Resend for Vercel Integration](https://resend.com/blog/vercel-integration)
- [API Key Creation & Permissions](https://resend.com/docs/api-reference/api-keys/create-api-key)
- [Resend with Vercel Functions](https://resend.com/docs/send-with-vercel-functions)
- [Vercel Integration Guide](https://resend.com/docs/knowledge-base/vercel)

**Better Auth Documentation:**
- [Email & Password Provider](https://better-auth.com/docs/authentication/email-password)
- [Security & Password Hashing](https://better-auth.com/docs/reference/security)
- [Better Auth Options Reference](https://better-auth.com/docs/reference/options)

**GitHub:**
- [@neondatabase/serverless](https://github.com/neondatabase/serverless)
- [better-auth/utils](https://github.com/better-auth/utils)

---

## Unresolved Questions

1. **Better Auth hash exact format:** What is the exact byte representation/encoding of scrypt hashes stored in the account table? (Documentation doesn't specify, appears implementation-dependent)

2. **Neon pooler cold-start behavior:** Exact metrics for initial cold-start latency on pooled connections (docs mention sub-100ms for warm connections, but not initial wake-up)

3. **Resend domain verification DNS propagation:** Exact propagation timeline varies by DNS provider - no guaranteed SLA documented

4. **Better Auth Drizzle adapter pooling:** Whether Better Auth's Drizzle adapter automatically handles connection pooling or requires explicit configuration for Vercel's pooled connections
