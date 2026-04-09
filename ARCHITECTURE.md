# Kiến trúc Phả hệ App

## Tổng quan

Full-stack Next.js 16 app với MongoDB backend, Email OTP authentication, và offline-first architecture.

## Cài đặt

```bash
# 1. Install dependencies
pnpm install

# 2. Cấu hình environment
cp .env.local.example .env.local
# Điền MONGODB_URI, JWT_SECRET, SMTP_* vào .env.local

# 3. Chạy dev server
pnpm dev
```

## Cấu trúc thư mục

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── request-otp/route.ts    # POST: gửi OTP
│   │   │   ├── verify-otp/route.ts     # POST: verify OTP | DELETE: logout
│   │   │   └── google/route.ts         # OAuth placeholder (501)
│   │   ├── tree/
│   │   │   ├── route.ts                # GET: full tree | POST: create person/rel
│   │   │   ├── persons/
│   │   │   │   ├── route.ts            # POST: create person
│   │   │   │   └── [id]/route.ts       # PUT/PATCH/DELETE: update/delete person
│   │   │   └── relationships/
│   │   │       ├── route.ts            # POST: create relationship
│   │   │       └── [id]/route.ts       # DELETE: delete relationship
│   │   └── sync/route.ts               # POST: upload | GET: download
│   ├── layout.tsx                      # Root layout + AuthProvider
│   ├── page.tsx                        # Main page
│   ├── globals.css                     # Tailwind + CSS variables
│   └── family-tree.css                 # Standalone CSS cho tree UI
│
├── server/
│   ├── db/mongodb.ts                   # MongoDB singleton connection
│   ├── repositories/
│   │   ├── user.repository.ts          # Users CRUD
│   │   ├── person.repository.ts        # Persons CRUD
│   │   └── relationship.repository.ts  # Relationships CRUD
│   ├── services/
│   │   ├── auth.service.ts             # OTP, JWT, Google OAuth
│   │   ├── tree.service.ts             # Tree CRUD logic
│   │   └── sync.service.ts             # Sync local↔cloud
│   ├── controllers/
│   │   ├── auth.controller.ts          # HTTP handlers cho auth
│   │   ├── tree.controller.ts          # HTTP handlers cho tree
│   │   └── sync.controller.ts          # HTTP handlers cho sync
│   └── middleware/
│       └── auth.middleware.ts          # JWT verification HOF
│
├── contexts/
│   └── auth.context.tsx                # AuthProvider + useAuth hook
│
├── lib/
│   ├── api-client.ts                   # Frontend API calls
│   ├── utils.ts                        # cn() utility
│   └── family-tree/
│       ├── database.ts                 # Types + localStorage CRUD
│       ├── reducer.ts                  # State management (15+ actions)
│       └── layout-engine.ts            # Tree layout algorithm
│
├── components/
│   ├── auth/
│   │   ├── login-modal.tsx             # Email → OTP 2-step login
│   │   └── sync-modal.tsx              # Sync prompt dialog
│   ├── family-tree/
│   │   ├── family-tree-app.tsx         # Root component + auth integration
│   │   ├── tree-canvas.tsx             # Pan/zoom canvas
│   │   ├── tree-node.tsx               # Individual person node
│   │   ├── connection-lines.tsx        # SVG connection lines
│   │   ├── context-menu.tsx            # Right-click menu
│   │   ├── add-person-dialog.tsx       # Quick add dialog
│   │   └── person-form.tsx             # Full edit form
│   └── ui/                             # shadcn/ui components
│
└── hooks/
    └── use-mobile.ts                   # Mobile breakpoint hook
```

## Data Flow

### Unauthenticated
```
Browser → localStorage → reducer → UI
```

### Login (Email OTP)
```
1. Email → POST /api/auth/request-otp → nodemailer gửi OTP
2. OTP → POST /api/auth/verify-otp → JWT httpOnly cookie
3. AuthContext detect authenticated
4. Check localStorage: có data? → promptSync → SyncModal
5. Không có data? → GET /api/sync → load cloud → INIT reducer
```

### Sync Upload
```
POST /api/sync { localData }
→ syncService.syncLocalToCloud()
  → MongoDB transaction: delete all → insertMany persons
  → Tạo localId→ObjectId map
  → insertMany relationships (resolve ObjectIds)
→ Return cloud database
→ INIT reducer với cloud data
```

## ID Strategy

- localStorage dùng string IDs: `timestamp-random`
- MongoDB dùng ObjectId
- Mỗi document cloud lưu `localId` = original localStorage ID
- Reducer LUÔN dùng `localId` làm primary key → không cần refactor
- Khi load cloud data: map về localStorage format qua localId

## Security

- JWT trong httpOnly cookie (immune to XSS)
- 30-day expiry (genealogy app, không phải banking)
- Mọi DB query filter theo userId (ownership enforcement)
- OTP xóa ngay sau khi verify
- Email normalize (lowercase, trimmed) nhất quán

## Google OAuth Placeholder

Tìm `INSERT_GOOGLE_OAUTH` trong codebase để tìm 4 điểm cần implement:
1. `server/services/auth.service.ts` → `handleGoogleLogin()`
2. `server/controllers/auth.controller.ts` → `handleGoogleAuth()`
3. `app/api/auth/google/route.ts`
4. `.env.local.example` → `GOOGLE_CLIENT_ID/SECRET`
