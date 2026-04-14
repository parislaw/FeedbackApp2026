# Phase 7: SCORM 1.2 + xAPI Export

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 1 (need function slot for `api/export.ts`)
- Research: [SCORM/xAPI Research](./research/researcher-02-scorm-xapi.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** ~4h
- **Description:** Server-side SCORM 1.2 ZIP generation and xAPI statement JSON generation per completed session. Gated behind `corporateTier` flag. Build logic now, expose UI later (hidden for non-corporate users).

## Key Insights
- SCORM 1.2 package = ZIP with `imsmanifest.xml` at root + `launch.html` SCO entry point
- `jszip` is pure JS, works on Vercel serverless, async generation
- xAPI statement is just JSON — no library needed for MVP (skip `@xapi/xapi` dep)
- `cmi.suspend_data` has 4096 byte limit — transcript must be truncated or base64-compressed
- Corporate tier gate: boolean column on user table (added in Phase 2)
- Response size limit ~6MB on Vercel — SCORM ZIPs will be small (<100KB)

## Requirements
### Functional
- `POST /api/export` with `{ type: 'scorm' | 'xapi', reportId }` body
- SCORM: returns ZIP file download (application/zip)
- xAPI: returns JSON statement (application/json)
- Both require authenticated user + `corporateTier: true`
- SCORM package contains: imsmanifest.xml, launch.html (with embedded score + transcript summary), score data in CMI format
- xAPI statement: actor=user email, verb=completed, object=scenario, result=score + duration

### Non-functional
- No new npm dependencies beyond `jszip` (xAPI is plain JSON)
- SCORM packages are self-contained (no external dependencies in launch.html)
- ZIP generation is async (non-blocking)

## Architecture

### API Endpoint: `api/export.ts`
```typescript
// api/export.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { sendError } from './_lib/response-helpers.js';
import { getSessionFromHeaders } from './_lib/auth.js';
import { db, reports, user } from './_lib/db.js';
import { generateScormPackage } from './_lib/scorm-generator.js';
import { generateXapiStatement } from './_lib/xapi-generator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');

  // Corporate tier gate
  const [userData] = await db.select({ corporateTier: user.corporateTier })
    .from(user).where(eq(user.id, session.user.id));
  if (!userData?.corporateTier) return sendError(res, 403, 'Corporate tier required');

  const { type, reportId } = req.body as { type: 'scorm' | 'xapi'; reportId: string };
  // ... fetch report, generate export
}
```

### SCORM Generator: `api/_lib/scorm-generator.ts`
```typescript
import JSZip from 'jszip';

export async function generateScormPackage(params: {
  scenarioTitle: string;
  scenarioId: string;
  score: number;
  transcript: { role: string; text: string }[];
  userName: string;
  completedAt: string;
}): Promise<Buffer> {
  const zip = new JSZip();

  // imsmanifest.xml at root (CRITICAL)
  zip.file('imsmanifest.xml', buildManifest(params.scenarioTitle, params.scenarioId));

  // launch.html — self-contained SCO
  zip.file('launch.html', buildLaunchHtml(params));

  return await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
}
```

### xAPI Generator: `api/_lib/xapi-generator.ts`
```typescript
export function generateXapiStatement(params: {
  userEmail: string;
  userName: string;
  scenarioId: string;
  scenarioTitle: string;
  score: number;
  durationMinutes: number;
  completedAt: string;
}): object {
  return {
    actor: {
      objectType: 'Agent',
      name: params.userName,
      mbox: `mailto:${params.userEmail}`,
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    },
    object: {
      objectType: 'Activity',
      id: `https://accord.app/scenarios/${params.scenarioId}`,
      definition: {
        type: 'http://adlnet.gov/expapi/activities/lesson',
        name: { 'en-US': params.scenarioTitle },
        description: { 'en-US': 'Accord feedback practice session' },
      },
    },
    result: {
      completion: true,
      success: params.score >= 50,
      score: {
        scaled: params.score / 100,
        raw: params.score,
        min: 0,
        max: 100,
      },
      duration: `PT${params.durationMinutes}M`,
    },
    timestamp: params.completedAt,
    context: {
      language: 'en-US',
    },
  };
}
```

### SCORM Manifest Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="accord-${scenarioId}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>${scenarioTitle}</title>
      <item identifier="item1" identifierref="resource1">
        <title>Feedback Practice Session</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource1" type="webcontent" href="launch.html"
      adlcp:scormtype="sco">
      <file href="launch.html"/>
    </resource>
  </resources>
</manifest>
```

### Launch HTML
Self-contained HTML page that:
1. Calls `LMSInitialize()` via SCORM API wrapper
2. Sets `cmi.core.score.raw` to the session score
3. Sets `cmi.core.lesson_status` to `completed` (or `passed` if score >= 50)
4. Sets `cmi.suspend_data` to truncated transcript summary (base64, max 4096 bytes)
5. Calls `LMSFinish()`
6. Displays: score, scenario title, GAIN dimension breakdown, transcript summary

### Duration Calculation
Duration = time between first and last message in transcript. Estimate from `report.createdAt` minus estimated session length. For MVP, calculate from transcript message count * avg response time (~2 min per exchange pair) if no explicit timestamps.

## Related Code Files

### Create
- `api/export.ts` — export endpoint (SCORM ZIP or xAPI JSON)
- `api/_lib/scorm-generator.ts` — SCORM 1.2 ZIP generation with jszip
- `api/_lib/xapi-generator.ts` — xAPI statement builder

### Modify
- `package.json` — add `jszip` dependency
- `vercel.json` — no rewrite needed (single file, not catch-all)

### Future (not in this phase)
- `components/ExportButton.tsx` — UI trigger for corporate users (Phase 8+)

## Implementation Steps

1. **Install jszip**
   ```bash
   npm install jszip
   npm install -D @types/jszip  # if needed (jszip has built-in types)
   ```

2. **Create `api/_lib/xapi-generator.ts`**
   - Pure function, no dependencies
   - Takes session params, returns xAPI statement object
   - Follows xAPI 1.0.3 spec structure
   - ~40 lines

3. **Create `api/_lib/scorm-generator.ts`**
   - Import `JSZip`
   - `buildManifest(title, id)` — returns XML string from template
   - `buildLaunchHtml(params)` — returns self-contained HTML with SCORM API calls + score display
   - `generateScormPackage(params)` — assembles ZIP, returns Buffer
   - Keep launch.html minimal: inline CSS, no external dependencies
   - Truncate transcript to fit 4096 byte suspend_data limit

4. **Create `api/export.ts`**
   - POST handler with auth check
   - Corporate tier gate: query user table for `corporateTier`
   - Validate `type` param ('scorm' | 'xapi')
   - Fetch report by ID (verify ownership: report.userId === session.user.id)
   - Extract: scenarioTitle, score, transcript, user email/name
   - If SCORM: generate ZIP, return with Content-Type application/zip + Content-Disposition
   - If xAPI: generate statement, return JSON

5. **Verify function count**
   - After adding `api/export.ts`: should be 11/12 (with Phase 1 consolidation)

6. **Manual test**
   - Set `corporateTier: true` on a test user in DB
   - Call `POST /api/export { type: 'xapi', reportId: '...' }` — verify JSON
   - Call `POST /api/export { type: 'scorm', reportId: '...' }` — verify ZIP downloads
   - Open ZIP, verify `imsmanifest.xml` at root
   - Open `launch.html` in browser, verify it displays score

7. **SCORM validation** (optional but recommended)
   - Upload generated ZIP to a SCORM cloud validator (scorm.com/cloud)
   - Verify it passes SCORM 1.2 conformance

## Todo List
- [ ] Install `jszip`
- [ ] Create `api/_lib/xapi-generator.ts`
- [ ] Create `api/_lib/scorm-generator.ts`
- [ ] Create `api/export.ts`
- [ ] Test xAPI export returns valid statement JSON
- [ ] Test SCORM export returns valid ZIP
- [ ] Verify imsmanifest.xml is at ZIP root
- [ ] Verify launch.html renders score correctly
- [ ] Verify corporate tier gate blocks non-corporate users
- [ ] Verify report ownership check (can't export someone else's report)
- [ ] Verify function count <= 12

## Success Criteria
- `POST /api/export { type: 'scorm' }` returns downloadable ZIP
- ZIP contains valid `imsmanifest.xml` at root
- `launch.html` displays score and sets CMI data model values
- `POST /api/export { type: 'xapi' }` returns valid xAPI statement JSON
- Non-corporate users get 403
- Users can only export their own reports
- Vercel function count stays <= 12

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Transcript exceeds 4096 byte suspend_data | SCORM non-compliant | Truncate + base64 encode, include only summary |
| imsmanifest.xml not at ZIP root | LMS rejects package | Test: unzip and verify path |
| jszip cold start on Vercel | Slow first request | Acceptable for corporate feature; lazy import |
| launch.html SCORM API not found | Score not recorded in LMS | Include APIWrapper.js with graceful fallback |

## Security Considerations
- Corporate tier check is server-side (not just UI hide)
- Report ownership verified: `report.userId === session.user.id`
- No PII in SCORM package beyond user name (which is already in the LMS)
- xAPI uses email as actor identifier (standard practice)
- No Stripe or auth data in exports

## Next Steps
- Future: Add `ExportButton` to ReportHistoryPage for corporate users
- Future: LRS integration — POST xAPI statements directly to customer's LRS
- Future: SCORM 2004 support if requested
