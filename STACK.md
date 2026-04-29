# resQ App — Stack & Architecture Summary

## Project Overview

**Name:** resQ  
**Theme:** AI-Powered Disaster Response Coordination Platform  
**Type:** Map-based mobile application connecting disaster victims and volunteers in real-time.

---

## Backend Stack

| Concern            | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Runtime            | Node.js v18+                                            |
| Language           | TypeScript 5.7+                                         |
| Framework          | NestJS 11                                               |
| GraphQL Server     | `@nestjs/graphql` + `@nestjs/apollo` + Apollo Server 5  |
| Database           | MongoDB 6+                                              |
| ORM                | Mongoloquent 3 + `@mongoloquent/nestjs`                 |
| Authentication     | JWT — `@nestjs/jwt` + `@nestjs/passport` + `bcryptjs`  |
| Validation         | `class-validator` + `class-transformer`                 |
| Job Queue          | BullMQ + `@nestjs/bullmq` (urgency scoring async jobs)  |
| Image Upload       | Cloudinary + Multer                                     |
| Email              | Nodemailer (password reset)                             |
| Push Notifications | Expo Push Notifications via `expo-server-sdk`           |
| Config             | `@nestjs/config`                                        |
| Real-time          | GraphQL WebSocket transport configured (`graphql-ws`), subscriptions not yet implemented |

### Backend Install

```bash
npm i -g @nestjs/cli
nest new server
cd server

npm install @nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql
npm install mongoloquent @mongoloquent/nestjs mongodb
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
npm install @nestjs/config class-validator class-transformer
npm install @nestjs/bullmq bullmq
npm install cloudinary multer
npm install nodemailer
npm install expo-server-sdk
npm install graphql-ws graphql-subscriptions
```

---

## Frontend Stack

| Concern          | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | React Native 0.81.5 (Expo SDK ~54)                     |
| Language         | JavaScript (JSX)                                        |
| Workflow         | Expo Dev Client (Managed Workflow + custom native modules) |
| GraphQL Client   | `@apollo/client` 4                                      |
| State Management | Apollo Client Cache                                     |
| Maps             | `react-native-maps` 1.20 (Google Maps)                  |
| Navigation       | React Navigation 7 (bottom tabs + native stack)         |
| UI               | React Native Paper 5                                    |
| Icons            | `react-native-vector-icons` + `@expo/vector-icons`      |
| Push Notifications | `expo-notifications`                                  |
| Image Picker     | `expo-image-picker` + `react-native-image-picker`       |
| Location         | `expo-location`                                         |
| Auth Token Store | `expo-secure-store`                                     |
| Local Storage    | `@react-native-async-storage/async-storage`             |
| Visuals          | `expo-linear-gradient` + `expo-blur`                    |
| Safe Area        | `react-native-safe-area-context`                        |

### Frontend Install

```bash
npx create-expo-app app
cd app

npx expo install expo-dev-client
npx expo install @apollo/client graphql
npx expo install react-native-maps
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install expo-location expo-notifications expo-secure-store
npx expo install expo-image-picker expo-linear-gradient expo-blur
npx expo install @react-native-async-storage/async-storage
npm install react-native-paper react-native-vector-icons
```

---

## Key Architecture Decisions

### 1. NestJS + Mongoloquent Integration

```typescript
// AppModule
MongoloquentModule.forRoot({ connection: process.env.MONGO_URI, database: process.env.DB_NAME, global: true })

// Feature Module
MongoloquentModule.forFeature([User, Request, DangerZone])

// Service
@InjectModel(User) private userModel: typeof User
```

### 2. Geospatial Queries — Two-Track Approach

Mongoloquent does **not** support MongoDB geospatial operators (`$near`, `$geoWithin`).  
Use raw MongoDB driver via `@InjectDB()` for location-based queries.

```typescript
// Regular CRUD → Mongoloquent ORM
@InjectModel(Request) private requestModel: typeof Request

// Geospatial → Raw driver
@InjectDB() private db: DB

async findNearby(lng: number, lat: number, radiusMeters: number) {
  return this.db.collection('requests').where('location', {
    $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: radiusMeters },
  }).get();
}
```

> Any collection queried by location needs a `2dsphere` index:
> ```js
> db.requests.createIndex({ location: "2dsphere" })
> db.danger_zones.createIndex({ location: "2dsphere" })
> ```

### 3. Mongoloquent Operator Limitation

Mongoloquent wraps MongoDB operator objects (`$regex`, `$ne`, etc.) inside `$eq`, breaking them.  
**Workaround:** use `.whereIn()` for inclusion/exclusion, and apply text search + complex filters in JS after fetching.

```typescript
// Broken — Mongoloquent wraps this in $eq
.where('status', { $ne: 'completed' })

// Correct
.whereIn('status', ['pending', 'in_progress'])

// Text search — always filter in JS
const results = await query.get()
return results.filter(r => r.name.toLowerCase().includes(term))
```

### 4. Async Urgency Scoring with BullMQ

When a request is created, urgency scoring (Gemini AI) runs asynchronously via a BullMQ job so the mutation returns immediately.

```typescript
// On createRequest
await this.urgencyQueue.add(SCORE_URGENCY_JOB, { requestId, input }, { removeOnComplete: true })

// Processor picks it up, calls Gemini, patches urgencyScore
```

### 5. Apollo Client Cache Merge Policies

All list queries need `merge: false` in `InMemoryCache` to prevent Apollo's cache merge conflict (error 112) on polling:

```js
new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        getRequests: { merge: false },
        getActiveDangerZones: { merge: false },
        getWeatherLogs: { merge: false },
        // ... all list fields
      },
    },
  },
})
```

### 6. Map Memory Management

Google Maps on Android has a 256MB heap limit. With many danger zone circles + markers:
- Cap rendered zones to **80 max** (sorted by severity: extreme → severe → moderate)
- Use `useMemo` on rendered map elements to prevent re-creation on unrelated state changes

### 7. Expo Dev Client Workflow

App uses **Expo Dev Client** (managed workflow) — not bare workflow.  
This means no `android/` or `ios/` folders in source; native config goes through `app.json` plugins.

---

## Radius Constants

| Constant                          | Value  | Used For                              |
| --------------------------------- | ------ | ------------------------------------- |
| `NEARBY_REQUESTS_RADIUS_KM`       | 5 km   | Show requests near current location   |
| `DANGER_ZONE_NOTIFICATION_RADIUS_KM` | 10 km | Push notification trigger radius   |

---

## Potential Risks & Mitigations

| Risk                                        | Mitigation                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Mongoloquent has no geospatial support      | Use `@InjectDB()` raw driver for geo queries                        |
| Mongoloquent breaks `$ne`/`$regex` operators | Use `.whereIn()` and JS-side filtering                             |
| Google Maps OOM on Android                  | Cap zones at 80, `useMemo` on map elements                          |
| Apollo cache merge conflict (error 112)     | Set `merge: false` on all list query type policies                  |
| Expo managed workflow limits native modules | Switch to bare workflow if background location is needed            |
| MongoDB geospatial queries need index       | Create `2dsphere` index on bootstrap                                |
