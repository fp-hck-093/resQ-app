# ResQ — Server Documentation

## Overview

ResQ is a disaster response platform. The server provides a GraphQL API (with one REST endpoint for file uploads) built on NestJS. It connects to a MongoDB Atlas database via the Mongoloquent ORM and integrates with Cloudinary, WeatherAPI, BMKG, and Google Gemini AI.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | NestJS v11 |
| API | GraphQL (Apollo, code-first) |
| ORM | Mongoloquent (Laravel Eloquent-style for MongoDB) |
| Database | MongoDB Atlas |
| Auth | JWT (Bearer token) |
| File storage | Cloudinary |
| Weather | WeatherAPI |
| Disaster alerts | BMKG (earthquake + nowcast RSS/CAP feeds) |
| AI analysis | Google Gemini 1.5 Flash |
| Email | Nodemailer (SMTP/Gmail) |

---

## Environment Variables

```env
PORT=3000
MONGO_URI=           # MongoDB Atlas connection string
DB_NAME=resq-db
JWT_SECRET=          # secret for signing JWT tokens
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WEATHER_API_KEY=     # WeatherAPI.com key
GEMINI_API_KEY=      # Google Generative Language API key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
EMAIL_USER=
EMAIL_PASS=
FRONTEND_URL=        # used in password reset email links
```

---

## Architecture

```
src/
├── auth/               JWT auth, register, login, password reset
├── users/              User profiles, location updates
├── requests/           Disaster aid requests lifecycle
├── locations/          Saved user locations (for map & notifications)
├── activity-logs/      Volunteer activity history
├── bmkg-logs/          Earthquake & nowcast alert ingestion
├── weather/            On-demand weather log fetching
├── danger-zones/       AI-generated danger zones from all sources
├── upload/             REST endpoints for image uploads (Cloudinary)
├── cloudinary/         Cloudinary service wrapper
├── mail/               Email service (password reset)
└── common/
    ├── constants/      radius.constants.ts
    ├── decorators/     @CurrentUser()
    ├── guards/         JwtGuard
    └── types/          GeoPoint, GeoPolygon
```

All GraphQL operations are accessible at `/graphql`.
The Apollo Sandbox landing page is enabled in development.
GraphQL subscriptions are enabled via `graphql-ws`.

### ID types

Foreign key fields (`userId`, `volunteerId`, `requestId`, `sourceIds`) are stored as MongoDB `ObjectId`. All IDs arriving from the client (JWT payload, GraphQL args) are strings and converted with `new ObjectId(id)` at the service boundary.

---

## Modules

---

### Auth

**Collection:** none (reads from `users`)

#### Operations

| Type | Name | Auth | Description |
|---|---|---|---|
| Mutation | `register(input)` | — | Creates account, returns success message |
| Mutation | `login(input)` | — | Returns `{ accessToken, user }` |
| Mutation | `forgotPassword(input)` | — | Sends reset link to email |
| Mutation | `resetPassword(input)` | — | Validates token, updates password |
| Query | `me` | JWT | Returns the current user |

#### DTOs

```graphql
input RegisterInput  { name, email, phone, password }
input LoginInput     { email, password }
input ForgotPasswordInput { email }
input ResetPasswordInput  { token, newPassword }

type AuthResponse { accessToken: String!, user: User! }
```

---

### Users

**Collection:** `users`

#### Model fields

| Field | Type | Notes |
|---|---|---|
| `_id` | ID | |
| `name` | String | |
| `email` | String | unique |
| `phone` | String | |
| `password` | String | hidden from GraphQL |
| `profilePhoto` | String? | Cloudinary URL |
| `currentLocation` | GeoPoint? | updated by device GPS |
| `currentAddress` | String? | |

#### Operations

| Type | Name | Auth | Description |
|---|---|---|---|
| Query | `getUsers` | JWT | Returns all users |
| Query | `getUser(id)` | JWT | Returns a single user |
| Query | `searchUsers(name, page?, limit?)` | JWT | Case-insensitive name search with pagination |
| Query | `me` | JWT | See Auth module |
| Mutation | `updateUser(input)` | JWT | Updates name / phone / profilePhoto |
| Mutation | `updateLocation(input)` | JWT | Updates `currentLocation` + `currentAddress` |
| Mutation | `changePassword(input)` | JWT | Validates current password before updating |

#### `searchUsers` response

```graphql
type PaginatedUsers {
  data:  [User!]!
  total: Int!   # total matched (before pagination)
  page:  Int!
  limit: Int!
}
```

Defaults: `page = 1`, `limit = 10`.

---

### Requests

**Collection:** `requests`

#### Model fields

| Field | Type | Notes |
|---|---|---|
| `_id` | ID | |
| `userId` | ObjectId | owner |
| `userName` | String | |
| `userPhone` | String | |
| `category` | String | `Rescue \| Shelter \| Food \| Medical \| Money/Item` |
| `description` | String | |
| `numberOfPeople` | Number | |
| `urgencyScore` | Number | AI-calculated by client before submission |
| `location` | GeoPoint | `[longitude, latitude]` |
| `address` | String | |
| `photos` | [String]? | Cloudinary URLs |
| `status` | String | `pending \| in_progress \| completed` |
| `volunteerIds` | [String]? | IDs of volunteers |

#### Operations

| Type | Name | Auth | Description |
|---|---|---|---|
| Query | `getAllRequests` | — | All requests, newest first |
| Query | `getRequestsByStatus(status)` | — | Filter by status |
| Query | `getRequestsByUserId(userId)` | — | All requests by a user |
| Query | `getMyRequests` | JWT | Shortcut for current user |
| Query | `getRequestById(id)` | — | Single request |
| Query | `getNearbyRequests(latitude, longitude, status?, category?)` | — | Requests within **10 km** of coordinates |
| Mutation | `createRequest(input)` | JWT | Creates a pending request |
| Mutation | `deleteRequest(id)` | JWT | Owner only; only `pending` requests |
| Mutation | `volunteerForRequest(requestId)` | JWT | Adds current user as volunteer |
| Mutation | `completeRequest(id)` | JWT | Owner marks `in_progress` → `completed` |

#### Business rules

- **Nearby radius** is fixed at 10 km server-side (`NEARBY_REQUESTS_RADIUS_KM`). Clients do not pass a radius.
- `deleteRequest` — only the owner can delete; only `pending` status is allowed.
- `volunteerForRequest` — the request owner cannot volunteer for their own request. Duplicate volunteers are rejected. First volunteer transitions status `pending → in_progress`. Further volunteers can still join while `in_progress`. Creates an `ActivityLog` entry.
- `completeRequest` — owner only; only `in_progress → completed`.

---

### Locations

**Collection:** `locations`

Stores saved map locations per user (used for danger zone notifications and map viewport filtering).

#### Model fields

| Field | Type | Notes |
|---|---|---|
| `_id` | ID | |
| `userId` | ObjectId | |
| `location` | GeoPoint | `[longitude, latitude]` |
| `address` | String | from Nominatim autocomplete |
| `city` | String | |
| `province` | String | |
| `country` | String | |
| `notifyOnNewRequests` | Boolean | default `false` |
| `notifyOnDangerZones` | Boolean | default `false` |
| `notificationRadius` | Number | km, defaults to `DANGER_ZONE_NOTIFICATION_RADIUS_KM` (10 km) |

> The frontend handles geocoding via Nominatim autocomplete. The backend stores exactly what the frontend sends — no server-side geocoding.

#### Operations

All operations require JWT. All enforce ownership.

| Type | Name | Description |
|---|---|---|
| Query | `getMyLocations` | All saved locations for current user |
| Query | `getLocationById(locationId)` | Single location |
| Mutation | `addLocation(input)` | Add a saved location |
| Mutation | `updateLocation(input)` | Toggle notification preferences |
| Mutation | `deleteLocation(locationId)` | Remove a saved location |

---

### Activity Logs

**Collection:** `activity_logs`

Records the volunteer history of a user — one entry per `(volunteerId, requestId)` pair.

#### Model fields

| Field | Type | Notes |
|---|---|---|
| `_id` | ID | |
| `volunteerId` | ObjectId | |
| `requestId` | ObjectId | |
| `status` | ActivityLogStatus | `active \| completed \| cancelled` |

#### Operations

| Type | Name | Auth | Description |
|---|---|---|---|
| Query | `getMyActivityLogs(page?, limit?, status?, sortOrder?)` | JWT | Paginated volunteer history with full request details |
| Mutation | `updateActivityStatus(requestId, status)` | JWT | Update own log status |

#### `getMyActivityLogs` args & response

```graphql
# Args
page:      Int     = 1
limit:     Int     = 10
status:    ActivityLogStatus?   # filter: active | completed | cancelled
sortOrder: String?  = "desc"    # "asc" | "desc" by createdAt

# Response
type PaginatedActivityLogs {
  data:  [ActivityLogWithRequest!]!
  total: Int!
  page:  Int!
  limit: Int!
}

type ActivityLogWithRequest {
  _id:         ID!
  volunteerId: String!
  requestId:   String!
  status:      ActivityLogStatus!
  request:     Request   # full request document joined server-side
  createdAt:   Date!
  updatedAt:   Date!
}
```

Requests are batch-fetched in a single query and joined in-memory — no N+1.

#### Status rules

- `completed` and `cancelled` are terminal — status cannot change further.
- `ActivityLog` entries are created automatically when a user calls `volunteerForRequest`.
- When a request is completed, all related logs are bulk-updated to `completed` via `updateStatusByRequest`.

---

### BMKG Logs

**Collections:** `earthquake_alerts`, `bmkg_alerts`

Polls two BMKG data sources automatically on server startup and on a fixed interval. No client trigger required for normal operation.

#### Earthquake alerts

Polled every **5 minutes** from `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`.

Deduplication: a record is only stored if `(tanggal, jam)` does not already exist.

| Field | Type |
|---|---|
| `tanggal` | String — date |
| `jam` | String — time |
| `location` | GeoPoint — `[longitude, latitude]` |
| `magnitude` | Float |
| `kedalaman` | String — depth |
| `wilayah` | String — region |
| `fetchedAt` | Date |

#### BMKG nowcast alerts (weather warnings)

Polled every **15 minutes** from the BMKG nowcast RSS feed. Each item's CAP XML is fetched and parsed.

Deduplication: skips if `identifier` already exists.

| Field | Type | Notes |
|---|---|---|
| `identifier` | String | CAP identifier |
| `title` | String | |
| `event` | String | e.g. `Thunderstorm` |
| `severity` | String | `Extreme \| Severe \| Moderate \| Minor \| Unknown` |
| `urgency` | String | |
| `certainty` | String | |
| `areaDesc` | String | semicolon-joined area names |
| `description` | String | |
| `effective` | String | ISO datetime |
| `expires` | String | ISO datetime |
| `location` | GeoPolygon | MultiPolygon — actual affected area boundary |
| `alertUrl` | String | source CAP XML URL |
| `isDangerous` | Boolean | `true` if severity is `Extreme \| Severe \| Moderate` |
| `fetchedAt` | Date | |

#### Operations

| Type | Name | Description |
|---|---|---|
| Query | `getEarthquakeAlerts(limit?)` | Recent earthquakes (default 20, newest first) |
| Query | `getBmkgAlerts` | All stored nowcast alerts |
| Query | `getActiveBmkgAlerts` | Alerts where `expires > now` |
| Mutation | `syncEarthquakeAlert` | Manually trigger one earthquake sync |
| Mutation | `fetchBmkgAlerts` | Manually trigger one nowcast sync |

---

### Weather

**Collection:** `weather_logs`

On-demand weather fetch — the client sends coordinates, the server calls WeatherAPI and stores the result.

#### Model fields

| Field | Type |
|---|---|
| `city` | String |
| `location` | GeoPoint |
| `condition` | String |
| `conditionCode` | Int |
| `windKph` | Float |
| `precipMm` | Float |
| `humidity` | Int |
| `visibilityKm` | Float |
| `isDangerous` | Boolean |
| `fetchedAt` | Date |

`isDangerous = true` when any of: `precipMm ≥ 20`, `windKph ≥ 60`, or `visibilityKm < 2`.

#### Operations

| Type | Name | Description |
|---|---|---|
| Query | `getWeatherLogs` | All stored weather logs |
| Query | `getDangerousWeather` | Logs where `isDangerous = true` |
| Mutation | `fetchWeather(latitude, longitude)` | Fetch & store current weather for a point |

---

### Danger Zones

**Collection:** `danger_zones`

Auto-generated zones derived from earthquake alerts, BMKG nowcast alerts, and weather data. Uses Google Gemini AI for compound signal analysis. Runs on startup and every **30 minutes**.

#### Model fields

| Field | Type | Notes |
|---|---|---|
| `title` | String | AI or rule-based |
| `description` | String | 1–2 sentence summary |
| `level` | String | `low \| moderate \| high \| extreme` |
| `sourceTypes` | [String] | e.g. `['earthquake', 'bmkg_alert']` |
| `sourceIds` | [ObjectId] | references to source documents |
| `location` | GeoPoint | centroid of the zone |
| `radiusKm` | Float | affected radius for map rendering |
| `activeFrom` | String | ISO datetime |
| `activeUntil` | String | ISO datetime |
| `isActive` | Boolean | set to `false` when expired |
| `requestCount` | Int | active requests within 20 km at creation time |

#### Zone generation logic

**Earthquake trigger** (M ≥ 5.0 only):

Radii are based on seismic energy scaling (factor of 30× per magnitude level) and represent the zone of **significant shaking / potential structural impact**, not just where the earthquake is felt. M4–5 can be felt up to 200 km, so M5+ zones must be substantially larger.

| Magnitude | Level | Radius | Active duration |
|---|---|---|---|
| 5.0 – 5.4 | moderate | 150 km | 12 h |
| 5.5 – 5.9 | moderate | 200 km | 12 h |
| 6.0 – 6.4 | high | 300 km | 24 h |
| 6.5 – 6.9 | high | 400 km | 24 h |
| 7.0 – 7.4 | extreme | 600 km | 48 h |
| 7.5 – 7.9 | extreme | 800 km | 72 h |
| 8.0+ | extreme | 1000 km | 72 h |

If BMKG alerts or dangerous weather exist within 100 km, Gemini is called with all signals to produce a compound assessment (overrides the rule-based values).

**BMKG alert trigger** (`isDangerous = true`, not expired):

- The MultiPolygon is split into individual polygons. One danger zone is created **per polygon** (one per distinct geographic area in the alert).
- Each polygon's centroid is computed from its outer ring only (holes are ignored).
- Compound signal lookup uses the first polygon's centroid as a reference point.
- Gemini is called once and the result is applied to all created zones.
- Fallback rule: `Extreme → extreme/30 km`, `Severe → high/20 km`, other → `moderate/15 km`.

**Deduplication:** if any active zone already references a source document's ID in `sourceIds`, that source is skipped for the current poll cycle.

**Expiry:** `deactivateExpired()` runs before every poll and sets `isActive = false` on zones whose `activeUntil` has passed.

#### Operations

| Type | Name | Description |
|---|---|---|
| Query | `getActiveDangerZones` | All active non-expired zones |
| Query | `getDangerZonesNear(latitude, longitude, radiusKm?)` | Zones visible to the user. A zone is included if the distance from the user to the zone centroid is within **either** the user's `radiusKm` (map viewport, defaults to 100 km) **or** the zone's own `radiusKm` — whichever is larger. This ensures large-scale events (e.g. M8+ at 1000 km) are always shown to users inside the affected area regardless of their personal notification radius. |
| Mutation | `triggerDangerZoneAnalysis` | Manually trigger a full analysis cycle |

---

### Upload (REST)

JWT is required for both endpoints (`Authorization: Bearer <token>`).

| Method | Endpoint | Field name | Max size | Allowed types | Cloudinary folder |
|---|---|---|---|---|---|
| POST | `/upload/profile-photo` | `file` | 5 MB | JPEG, PNG, WEBP | `resq/profile-photos` |
| POST | `/upload/request-photo` | `file` | 10 MB | JPEG, PNG, WEBP | `resq/request-photos` |

**Response:** `{ "url": "https://res.cloudinary.com/..." }`

Upload the photo first, then include the returned URL in `createRequest` or `updateUser`.

---

## Common Patterns

### Authentication

Protected resolvers use `@UseGuards(JwtGuard)`. The JWT payload is accessed via `@CurrentUser() user: User`.

Pass the token as an HTTP header:
```
Authorization: Bearer <accessToken>
```

### GeoPoint

All point-based location fields follow GeoJSON format stored as `[longitude, latitude]` (longitude first). The GraphQL type exposes:
```graphql
type GeoPoint {
  type:        String!   # always "Point"
  coordinates: [Float!]! # [longitude, latitude]
}
```

### Error format

GraphQL errors are normalised:
```json
{
  "message": "human-readable error message",
  "extensions": { "code": "BAD_USER_INPUT | UNAUTHENTICATED | ..." }
}
```

---

## Key Data Flows

### User volunteers for a request

1. `volunteerForRequest(requestId)` — JWT required
2. Server validates: not own request, not already volunteered, not completed
3. Volunteer's ID appended to `request.volunteerIds`
4. If first volunteer: `status` transitions `pending → in_progress`
5. `ActivityLog` entry created with `status: active`

### Danger zone lifecycle

```
BMKG / Earthquake poll (every 5–30 min)
        ↓
Signal is dangerous + not already zoned?
        ↓ yes
Nearby compound signals within 100 km?
        ├─ yes → call Gemini AI → AI-determined title, level, radius, duration
        └─ no  → rule-based defaults
        ↓
Create DangerZone document(s)
        ↓
Poll cycle: deactivateExpired() marks stale zones isActive = false
```

### Password reset flow

1. `forgotPassword(email)` — server generates a reset token, emails a link
2. User clicks link → frontend extracts token
3. `resetPassword(token, newPassword)` — server validates token, updates password
