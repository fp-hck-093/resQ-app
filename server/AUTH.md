# Auth & Users Module — Flow Documentation

## File Structure

```
src/
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts   ← injects logged-in user into resolvers
│   ├── guards/
│   │   └── jwt.guard.ts                ← protects resolvers with JWT
│   └── types/
│       └── geo-point.type.ts           ← reusable GeoJSON Point GraphQL type
├── users/
│   ├── models/
│   │   └── user.model.ts               ← Mongoloquent model + GraphQL ObjectType
│   ├── users.service.ts                ← DB operations (findByEmail, findById, create)
│   └── users.module.ts                 ← registers User model, exports UsersService
└── auth/
    ├── dto/
    │   ├── register.input.ts           ← GraphQL input type for register
    │   ├── login.input.ts              ← GraphQL input type for login
    │   └── auth.response.ts            ← GraphQL response type { token, user }
    ├── auth.service.ts                 ← register & login business logic
    ├── auth.resolver.ts                ← register, login, me GraphQL endpoints
    ├── jwt.strategy.ts                 ← validates JWT on every protected request
    └── auth.module.ts                  ← wires up UsersModule, JwtModule, PassportModule
```

---

## File Dependency Map

### Register

```
auth.resolver.ts
  │  uses ← register.input.ts        (validates & transforms input)
  │  uses ← auth.response.ts         (return type — but register returns String)
  └─ calls → auth.service.ts
               │  calls → users.service.ts
               │            └─ calls → user.model.ts   (Mongoloquent → MongoDB)
               └─ calls → bcryptjs                     (hash password)
```

### Login

```
auth.resolver.ts
  │  uses ← login.input.ts           (validates & transforms input)
  │  uses ← auth.response.ts         (return type { token, user })
  └─ calls → auth.service.ts
               │  calls → users.service.ts
               │            └─ calls → user.model.ts   (Mongoloquent → MongoDB)
               ├─ calls → bcryptjs                     (compare password)
               └─ calls → JwtService                   (@nestjs/jwt — sign token)
```

### Me Query (protected)

```
Request (with Bearer token in header)
  │
  ↓
jwt.guard.ts                                           (intercepts request)
  └─ triggers → jwt.strategy.ts
                  │  calls → users.service.ts
                  │            └─ calls → user.model.ts (Mongoloquent → MongoDB)
                  └─ attaches user to request
  │
  ↓
auth.resolver.ts
  └─ uses → current-user.decorator.ts                 (reads user from request)
```

### Module Wiring

```
app.module.ts
  ├─ imports → UsersModule
  │              ├─ imports → MongoloquentModule.forFeature([User])
  │              └─ exports → UsersService
  └─ imports → AuthModule
                 ├─ imports → UsersModule              (to use UsersService)
                 ├─ imports → PassportModule           (for JWT strategy)
                 ├─ imports → JwtModule                (to use JwtService)
                 └─ providers → [AuthService, AuthResolver, JwtStrategy]
```

---

## Register Flow

**GraphQL Mutation:**
```graphql
mutation {
  register(input: {
    name: "John Doe"
    email: "john@email.com"
    phone: "08123456789"
    password: "secret123"
  })
}
```

**Step-by-step:**

```
1. Client sends register mutation
      ↓
2. ValidationPipe runs on RegisterInput
   - name     → trim, IsNotEmpty
   - email    → trim, lowercase, IsEmail, IsNotEmpty
   - phone    → trim, IsNotEmpty
   - password → trim, MinLength(5), IsNotEmpty
   → fails here with specific error message if invalid
      ↓
3. AuthResolver.register(input) called
      ↓
4. AuthService.register(input)
   a. UsersService.findByEmail(email)
      → throws ConflictException("Email already registered") if exists
   b. bcrypt.hash(password, 10) → hashed password
   c. UsersService.create({ name, email, phone, password: hashed })
      → Mongoloquent inserts document into users collection
      → MongoDB auto-generates _id, createdAt, updatedAt
      ↓
5. Returns "Register success"
```

**Success Response:**
```json
{
  "data": {
    "register": "Register success"
  }
}
```

**Error Responses:**
```json
{ "errors": [{ "message": "Email is required", "extensions": { "code": "BAD_REQUEST" } }] }
{ "errors": [{ "message": "Email is invalid", "extensions": { "code": "BAD_REQUEST" } }] }
{ "errors": [{ "message": "Password must be at least 5 characters", "extensions": { "code": "BAD_REQUEST" } }] }
{ "errors": [{ "message": "Email already registered", "extensions": { "code": "CONFLICT" } }] }
```

---

## Login Flow

**GraphQL Mutation:**
```graphql
mutation {
  login(input: {
    email: "john@email.com"
    password: "secret123"
  }) {
    token
    user {
      _id
      name
      email
      phone
      profilePhoto
      currentLocation {
        type
        coordinates
      }
      currentAddress
      createdAt
      updatedAt
    }
  }
}
```

**Step-by-step:**

```
1. Client sends login mutation
      ↓
2. ValidationPipe runs on LoginInput
   - email    → trim, lowercase, IsEmail, IsNotEmpty
   - password → trim, IsNotEmpty
   → fails here with specific error message if invalid
      ↓
3. AuthResolver.login(input) called
      ↓
4. AuthService.login(input)
   a. UsersService.findByEmail(email)
      → throws UnauthorizedException("Email / Password invalid") if not found
   b. bcrypt.compare(password, user.password)
      → throws UnauthorizedException("Email / Password invalid") if wrong
   c. JwtService.sign({ sub: user._id, email: user.email })
      → generates JWT token (no expiry — persistent login)
      ↓
5. Returns { token, user }
   - password is hidden from user object via @HideField()
```

**Success Response:**
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "69eb3aebf6f4904951163ecf",
        "name": "John Doe",
        "email": "john@email.com",
        "phone": "08123456789",
        "profilePhoto": null,
        "currentLocation": null,
        "currentAddress": null,
        "createdAt": "2026-04-24T16:42:03.000Z",
        "updatedAt": "2026-04-24T16:42:03.000Z"
      }
    }
  }
}
```

**Error Responses:**
```json
{ "errors": [{ "message": "Email is invalid", "extensions": { "code": "BAD_REQUEST" } }] }
{ "errors": [{ "message": "Password is required", "extensions": { "code": "BAD_REQUEST" } }] }
{ "errors": [{ "message": "Email / Password invalid", "extensions": { "code": "UNAUTHENTICATED" } }] }
```

---

## Me Query (Get Current User)

**GraphQL Query:**
```graphql
query {
  me {
    _id
    name
    email
  }
}
```

**HTTP Header required:**
```
Authorization: Bearer <token>
```

**Step-by-step:**

```
1. Client sends me query with Bearer token in header
      ↓
2. JwtGuard intercepts request
      ↓
3. JwtStrategy runs
   a. Extracts token from Authorization header
   b. Verifies token signature using JWT_SECRET
   c. Decodes payload → { sub: userId, email }
   d. UsersService.findById(userId) → fetches user from DB
   e. Attaches user to request object
      ↓
4. AuthResolver.me() called
   - @CurrentUser() extracts user from request
   - Returns user directly (no extra DB call)
```

**Error Response (no token or invalid token):**
```json
{ "errors": [{ "message": "Unauthorized", "extensions": { "code": "UNAUTHENTICATED" } }] }
```

---

## User Schema (MongoDB)

```
users collection
├── _id          ObjectId   auto-generated
├── name         String     required
├── email        String     required, unique, lowercased
├── phone        String     required
├── password     String     bcrypt hashed, never returned in API
├── profilePhoto String     nullable, URL to image
├── currentLocation
│   ├── type        String   "Point" (GeoJSON)
│   └── coordinates Number[] [longitude, latitude]
├── currentAddress String   nullable, human-readable address
├── createdAt    Date       auto by Mongoloquent
└── updatedAt    Date       auto by Mongoloquent
```

---

## JWT Token

- Algorithm: HS256
- Payload: `{ sub: userId, email, iat }`
- Expiry: **none** (persistent login by design)
- Secret: stored in `.env` as `JWT_SECRET`
- Usage: `Authorization: Bearer <token>` header on all protected requests
