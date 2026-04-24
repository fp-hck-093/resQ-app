# resQ App — Stack & Architecture Summary

## Project Overview

**Name:** resQ  
**Theme:** AI-Powered Disaster Response Coordination Platform  
**Type:** Real-time, map-based mobile application connecting victims and volunteers during disasters.

---

## Backend Stack

| Concern        | Technology                                         |
| -------------- | -------------------------------------------------- |
| Runtime        | Node.js v18+                                       |
| Language       | TypeScript                                         |
| Framework      | NestJS                                             |
| GraphQL Server | `@nestjs/graphql` + `@nestjs/apollo`               |
| Database       | MongoDB 6+                                         |
| ORM            | Mongoloquent v3 + `@mongoloquent/nestjs`           |
| Authentication | JWT — `@nestjs/jwt` + `@nestjs/passport`           |
| Validation     | `class-validator` + `class-transformer`            |
| Real-time      | GraphQL Subscriptions (WebSocket via `graphql-ws`) |
| Config         | `@nestjs/config`                                   |
| Notifications  | Expo Push Notifications (API call from server)     |

### Backend Setup

**Step 1 — Install NestJS CLI and scaffold the project (run once globally):**

```bash
npm i -g @nestjs/cli
nest new server

cd server
npm install @nestjs/config
```

**Step 2 — Install application dependencies (inside the `server/` folder):**

```bash
npm install @nestjs/graphql @nestjs/apollo apollo-server-express graphql
npm install mongoloquent @mongoloquent/nestjs mongodb
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config class-validator class-transformer
npm install graphql-ws graphql-subscriptions
```

---

## Frontend Stack

| Concern            | Technology                                  |
| ------------------ | ------------------------------------------- |
| Framework          | React Native 0.73+ (Expo)                   |
| Language           | TypeScript                                  |
| GraphQL Client     | `@apollo/client`                            |
| State Management   | Apollo Client Cache                         |
| Maps               | `react-native-maps`                         |
| Navigation         | React Navigation 6                          |
| UI                 | React Native Paper / NativeBase             |
| Push Notifications | Firebase Cloud Messaging                    |
| Camera             | `react-native-image-picker`                 |
| Location           | `@react-native-community/geolocation`       |
| Local Storage      | `@react-native-async-storage/async-storage` |

---

## Key Architecture Decisions

### 1. NestJS + Mongoloquent Integration

Mongoloquent has an official NestJS package (`@mongoloquent/nestjs`) that follows standard NestJS patterns:

```typescript
// AppModule
MongoloquentModule.forRoot({
  connection: process.env.MONGO_URI,
  database: process.env.DB_NAME,
  global: true,
})

// Feature Module
MongoloquentModule.forFeature([User, Report, Volunteer])

// Service
@InjectModel(User) private userModel: typeof User
```

### 2. Geospatial Queries — Two-Track Approach

Mongoloquent does **not** support MongoDB geospatial operators (`$near`, `$geoWithin`) natively.  
Use raw MongoDB driver via `@InjectDB()` for all location-based queries.

```typescript
// Regular CRUD → Mongoloquent ORM
@InjectModel(User) private userModel: typeof User

// Geospatial queries → Raw driver
@InjectDB() private db: DB

async findNearby(lng: number, lat: number, radiusMeters: number) {
  return this.db
    .collection('users')
    .find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    })
    .toArray();
}
```

> **Important:** Any collection queried by location needs a `2dsphere` index.
> Create it once during app bootstrap:
>
> ```javascript
> db.users.createIndex({ location: "2dsphere" });
> db.reports.createIndex({ location: "2dsphere" });
> ```

### 3. Validation — Zod → class-validator

NestJS is decorator-based. Zod can work but fights the framework.  
Use `class-validator` + `class-transformer` with `ValidationPipe` instead — it's the idiomatic NestJS approach.

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ transform: true }));
```

### 4. Real-time — GraphQL Subscriptions

For live victim/volunteer updates, use GraphQL Subscriptions over WebSocket.  
Both `@nestjs/graphql` (server) and `@apollo/client` (client) support this natively.

> **Note:** WebSocket connections are fragile on mobile in poor-connectivity disaster zones.  
> Implement reconnection logic on the Apollo Client side using `graphql-ws`.

### 5. Expo Workflow

If the app needs **background location tracking** (victims passively sharing location), use **Expo Bare Workflow** for full native module access.  
Managed workflow is sufficient if location is only tracked when the app is open.

---

## Role-Based Access

Two user roles:

- **Victim** — reports disaster location, requests help
- **Volunteer** — receives nearby assignments, updates status

Implement via NestJS Guards + JWT claims.

---

## Potential Risks & Mitigations

| Risk                                        | Mitigation                                                       |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Mongoloquent has no geospatial support      | Use `@InjectDB()` raw driver for geo queries                     |
| WebSocket drops in disaster zones           | Use `graphql-ws` auto-reconnect + Apollo cache for offline reads |
| Expo managed workflow limits native modules | Switch to bare workflow if background location is needed         |
| MongoDB geospatial queries need index       | Create `2dsphere` index on bootstrap                             |
