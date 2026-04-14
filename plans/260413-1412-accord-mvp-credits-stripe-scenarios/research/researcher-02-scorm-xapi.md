# SCORM 1.2 & xAPI Research Report

**Date:** 2026-04-13 | **Research:** SCORM 1.2 + xAPI for Node.js/Vercel Serverless Export

---

## 1. SCORM 1.2 Package Structure

### Minimum Viable Package
A SCORM 1.2 package is a **ZIP file** with structure:
```
package.zip
├── imsmanifest.xml (required at ZIP root)
├── launch.html (SCO entry point)
├── assets/ (CSS, JS, media)
└── [optional] XSD schema files
```

**Critical:** `imsmanifest.xml` MUST be at ZIP root (`./`), not in subfolder. Most upload failures occur from incorrect path.

### Core Files Required
- **imsmanifest.xml**: Package metadata, organizations, resources
- **launch.html**: HTML entry point with embedded SCORM API initialization
- **APIWrapper.js** (optional): JavaScript wrapper for `LMSInitialize()`, `LMSSetValue()`, `LMSFinish()`

### Minimal Manifest Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="accordion-manifest" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
    http://www.adlnet.org/xsd/adlcp_v1p2 adlcp_v1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Feedback Practice Session</title>
      <item identifier="item1" identifierref="resource1">
        <title>Session Activity</title>
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

---

## 2. SCORM 1.2 Data Model (CMI)

**Key Elements for Session Export:**

| Element | Type | Max Size | Notes |
|---------|------|----------|-------|
| `cmi.core.score.raw` | Number (0-100) | — | Final numeric score |
| `cmi.core.lesson_status` | Enum | — | Values: `not attempted`, `browsed`, `passed`, `completed`, `failed`, `incomplete` |
| `cmi.suspend_data` | String | 4096 bytes | Scratchpad for session transcript/state |
| `cmi.core.lesson_location` | String | 255 chars | Bookmark within activity |
| `cmi.core.exit` | Enum | — | Values: `"logout"`, `"timeout"`, `"suspend"`, `""` |

**Example CMI data for completed session with score 85:**
```javascript
{
  "cmi": {
    "core": {
      "score": { "raw": 85 },
      "lesson_status": "completed",
      "exit": "logout"
    },
    "suspend_data": "base64-encoded-transcript"
  }
}
```

---

## 3. Node.js ZIP Generation: Library Comparison

### Recommended: **jszip** for Vercel
- **Async generation** via `.generateAsync()` → returns Promise<Uint8Array>
- **Memory efficient**: no streaming needed for small SCORM packages
- **No native binaries**: pure JS, works on Vercel
- **Return type**: Buffer/Uint8Array ready for HTTP response

```bash
npm install jszip
```

### Alternative: **archiver** (if >50MB packages)
- Streaming-based, better for large ZIP
- Requires `fs` module (works on Vercel but slower)
- More overhead for small packages

### Not Recommended: **adm-zip**
- Synchronous (blocks execution)
- Less suitable for serverless functions

### Code Pattern for Vercel
```typescript
import JSZip from 'jszip';

export async function generateSCORMPackage(
  manifest: string,
  launchHtml: string,
  transcript: string
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('imsmanifest.xml', manifest);
  zip.file('launch.html', launchHtml);
  zip.folder('assets')?.file('transcript.txt', transcript);
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}

// In Vercel function:
const zipBuffer = await generateSCORMPackage(...);
res.setHeader('Content-Type', 'application/zip');
res.setHeader('Content-Disposition', 'attachment; filename="session.zip"');
res.end(zipBuffer);
```

---

## 4. xAPI (Tin Can API) Statement Structure

### Minimum Valid Statement
```json
{
  "actor": {
    "objectType": "Agent",
    "name": "John Doe",
    "mbox": "mailto:john@company.com"
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": { "en-US": "completed" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://accord.example.com/activities/feedback-session-2026-04-13",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/lesson",
      "name": { "en-US": "Feedback Practice Session" },
      "description": { "en-US": "Participant feedback session with score evaluation" }
    }
  },
  "result": {
    "completion": true,
    "success": true,
    "score": {
      "scaled": 0.85,
      "raw": 85,
      "min": 0,
      "max": 100
    },
    "duration": "PT45M30S"
  },
  "timestamp": "2026-04-13T17:30:00Z",
  "context": {
    "language": "en-US",
    "extensions": {
      "http://example.com/extension/transcript": "base64-transcript-data"
    }
  }
}
```

### Required Fields
- `actor` (Agent with `objectType`, `name`, `mbox`)
- `verb` (id as IRI, e.g., `http://adlnet.gov/expapi/verbs/completed`)
- `object` (Activity with `objectType`, `id`)

### Optional but Recommended for Scoring
- `result.score`: object with `scaled` (0-1), `raw` (0-100)
- `result.success`: boolean
- `result.duration`: ISO 8601 format (e.g., `PT45M30S`)

---

## 5. xAPI LRS Integration (Future)

### POST Statement to LRS
```typescript
async function postToLRS(statement: xAPIStatement, lrsUrl: string, credentials: { username: string; password: string }): Promise<void> {
  const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  
  const response = await fetch(`${lrsUrl}/statements`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-Experience-API-Version': '1.0.3'
    },
    body: JSON.stringify(statement)
  });
  
  if (!response.ok) throw new Error(`LRS POST failed: ${response.statusText}`);
}
```

### Key Headers
- `Authorization: Basic <base64(username:password)>`
- `X-Experience-API-Version: 1.0.3` (required)

---

## 6. npm Packages for xAPI

### **@xapi/xapi** (Recommended)
- Current: v3.0.2 (6 months old)
- TypeScript-friendly, full xAPI 1.0.3 spec compliance
- `npm install @xapi/xapi`
- Helper: `Statement`, `Agent`, `Verb`, `Activity`, `Result` classes

### **TinCanJS**
- Version: 0.50.0
- Legacy but stable, good for quick statements
- `npm install tincanjs`

### Usage Example
```typescript
import { Statement, Agent, Verb, Activity, Result } from '@xapi/xapi';

const statement = new Statement({
  actor: new Agent({ name: 'John Doe', mbox: 'mailto:john@company.com' }),
  verb: new Verb({ id: 'http://adlnet.gov/expapi/verbs/completed' }),
  object: new Activity({ id: 'https://accord.example.com/session-123' }),
  result: new Result({
    score: { scaled: 0.85, raw: 85, min: 0, max: 100 },
    success: true,
    completion: true
  })
});

console.log(JSON.stringify(statement)); // Valid JSON for LRS
```

---

## 7. Vercel Serverless Constraints & Solutions

| Constraint | Impact | Solution |
|-----------|--------|----------|
| No native binaries | ZIP libs must be pure JS | Use jszip (confirmed pure JS) |
| Max response size ~6MB | Large transcripts risky | Compress/encode transcript in suspend_data, return JSON w/ data URL |
| Memory limit 512MB-3GB | In-memory ZIP OK for <100MB packages | generateAsync() not an issue |
| No child_process | Can't shell-zip | Use jszip, confirmed safe |
| Cold start latency | First request slow | Cache manifest template, lazy-load JSZip |

### Recommended Response Pattern
```typescript
// Option A: Return ZIP directly (if <6MB)
res.setHeader('Content-Type', 'application/zip');
res.end(zipBuffer);

// Option B: Return JSON with download link (future)
res.json({ downloadUrl: 'https://...', statement: xapiStatement });
```

---

## Key Takeaways

1. **SCORM 1.2 Manifest**: Minimal 70-line XML; `imsmanifest.xml` at ZIP root is critical.
2. **ZIP Generation**: Use `jszip` with `.generateAsync()` for Vercel; pure JS, no dependencies.
3. **CMI Data**: `score.raw` (0-100), `lesson_status` (completed/passed/failed), `suspend_data` (4KB transcript).
4. **xAPI Minimum**: Actor + Verb + Object; add `result.score` + `result.duration` for LMS reporting.
5. **npm Package**: `@xapi/xapi` v3.0.2 recommended for TypeScript; `TinCanJS` v0.50.0 as fallback.
6. **LRS Posting**: Requires Basic auth header + `X-Experience-API-Version: 1.0.3`; implement as separate function.

---

## Unresolved Questions

1. **Transcript Encoding**: Should suspend_data be gzip-compressed or base64? (4KB limit may require compression)
2. **LRS Provider**: Which LRS vendor to target first (Moodle, Learning Locker, other)?
3. **Duration Calculation**: Is PT45M30S auto-calculated from session timestamps, or user-provided?
4. **Result Scope**: Should `result.score` be `scaled` (0-1) or both `scaled` + `raw` (0-100)?
5. **Package Re-usability**: Can same SCORM package be imported multiple times, or require unique manifest IDs per session?

---

## Sources

- [SCORM.com Content Packaging](https://scorm.com/scorm-explained/technical-scorm/content-packaging/)
- [Pipwerks SCORM Packaging Guide](https://pipwerks.com/packaging-a-scorm-course/)
- [jszip vs archiver Comparison](https://npm-compare.com/adm-zip,archiver,jszip,zip-local)
- [SCORM 1.2 Data Model - SkillSoft](https://documentation.skillsoft.com/en_us/ccps/custom_content_authoring_guidelines/scorm_1.2_authoring_guide/pub_scorm_1.2_data_model_support.htm)
- [xAPI Statements 101](https://xapi.com/statements-101/)
- [@xapi/xapi npm Package](https://www.npmjs.com/package/@xapi/xapi)
- [TinCanJS Library](https://rusticisoftware.github.io/TinCanJS/)
- [ADL SCORM-to-xAPI Wrapper](https://github.com/adlnet/SCORM-to-xAPI-Wrapper)
