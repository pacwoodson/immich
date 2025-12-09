# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Immich is a high-performance self-hosted photo and video management solution. It's a full-stack application with a NestJS backend, SvelteKit web frontend, Flutter mobile app, and Python-based machine learning service.

## Agent instructions

please follow @agent/claude.md for instructions of how agent should behave.

## Repository Structure

This is a **pnpm monorepo** with the following key packages:

- `server/` - NestJS backend API and microservices worker
- `web/` - SvelteKit web application
- `mobile/` - Flutter mobile application
- `machine-learning/` - Python FastAPI service for ML features (CLIP, face recognition, OCR)
- `cli/` - Command-line tool for bulk operations
- `e2e/` - End-to-end tests (Vitest + Playwright)
- `open-api/` - OpenAPI specification and generated TypeScript SDK
- `plugins/` - WebAssembly plugin system
- `docs/` - Documentation site

## Common Commands

### Development Setup

#### Start full development stack (server + web + ML + Redis + PostgreSQL)

`make dev`

Access the dev instance at http://localhost:3000

#### Building the app

To make sure the code is correct, build the apps with the following commands

```
# Build the server
make build-server
# Build the web frontend
make build-web
```

#### Testing

```bash
# Test specific modules
make test-server      # Unit tests with Vitest
make test-web         # Web unit tests
```

## Architecture

### Server Architecture (NestJS)

**Multi-Worker System**: The server runs in different modes controlled by `src/main.ts`:

- **API Worker**: HTTP/WebSocket endpoints (`PORT=3001`)
- **Microservices Worker**: Background job processing
- **Maintenance Mode**: Database migrations only

**Layered Pattern**:

1. **Controllers** (`src/controllers/`) - REST endpoints with decorators for auth, validation, and OpenAPI docs
2. **Services** (`src/services/`) - Business logic, inherit from `BaseService` which provides repository access
3. **Repositories** (`src/repositories/`) - Data access with Kysely type-safe SQL

**Event-Driven Communication**: Services communicate via `EventRepository`:

- 30+ event types: `AssetCreate`, `UserCreate`, `ConfigUpdate`, etc.
- Handlers use `@OnEvent(eventType)` decorator
- Events can be local (in-process) or server-side (distributed across workers)

**Job Queue System**: BullMQ with Redis manages 15 specialized queues:

- `thumbnailGeneration`, `metadataExtraction`, `videoConversion`
- `faceDetection`, `facialRecognition`, `smartSearch`
- `duplicateDetection`, `library`, `notifications`, etc.
- Services handle jobs with `@OnJob(queueName, jobType)` decorator
- Jobs are automatically retried with exponential backoff

**Database**: PostgreSQL with Kysely query builder

- Schema defined in `src/schema/*.ts`
- Migrations in `src/migrations/`
- Use `pnpm run migrations:generate` after schema changes

**Storage**: Template-based file organization

- Configurable path templates (user-based, date-based, etc.)
- Multiple asset files: original, preview, thumbnail, encoded video
- Sidecar files for metadata

**Key Technologies**:

- TypeScript with strict mode
- Kysely for type-safe SQL
- BullMQ + Redis for job queues
- Socket.IO for WebSockets
- OpenTelemetry for metrics/observability
- ExifTool for metadata extraction
- Sharp for image processing
- FFmpeg for video processing

### Web Architecture (SvelteKit)

**Framework**: SvelteKit with Svelte 5 (using new runes API)

- File-based routing in `src/routes/`
- Server-side rendering (SSR) with hydration

**Route Structure**:

- `(user)/` - Authenticated routes (photos, albums, map, people)
- `admin/` - Admin dashboard
- `auth/` - Login/registration flows
- `link/` - Public shared link viewer

**State Management**:

- Svelte 5 runes: `$state`, `$derived`, `$effect`
- Svelte stores in `src/lib/stores/`
- Persistent stores for user preferences

**Key Patterns**:

- **Managers**: `eventManager`, `themeManager`, `serverConfigManager`, `modalManager`
- **Components**: 36+ reusable components in `src/lib/components/`
- **Modals**: 56 modal components for dialogs
- **API Client**: Auto-generated TypeScript SDK from OpenAPI spec
- **WebSocket**: Real-time updates via `websocket.ts` store

**Styling**: Tailwind CSS v4 with `@tailwindcss/vite`

**Testing**: Vitest + Testing Library

### Mobile Architecture (Flutter/Dart)

**Framework**: Flutter with Riverpod for state management

**Architecture Pattern**: MVVM-inspired modular structure

- **Models**: Data structures and domain logic
- **Providers**: Riverpod providers for state management (51 providers)
- **Services**: Business logic and API communication (46 services)
- **Repositories**: Data access layer (33 repositories)
- **UI**: Reusable widgets
- **Views**: Full screen pages

**Local Storage**:

- Isar: NoSQL database for fast asset caching
- Drift: SQLite for relational data
- Offline-first approach with sync

**Background Sync**:

- Foreground service (Android) / Background fetch (iOS)
- Upload queue with retry logic
- Conflict resolution

**Navigation**: AutoRoute for type-safe routing

**API Client**: Auto-generated Dart SDK from OpenAPI spec

### Inter-Service Communication

**OpenAPI Specification**: Single source of truth in `open-api/immich-openapi-specs.json`

- Generates TypeScript SDK for web/CLI
- Generates Dart SDK for mobile
- Ensures type safety across stack

**REST API**: JWT authentication via cookies or headers, API keys, or shared link keys

**WebSocket Events** (Socket.IO):

- `on_upload_success`, `on_asset_delete`, `on_asset_update`
- `on_person_thumbnail`, `on_config_update`, `on_new_release`
- User-specific rooms for targeted messages

**Job Queues**: Services communicate via Redis-backed BullMQ queues

## Development Workflow

### Making Changes

1. **Server Changes**:

   - Modify code in `server/src/`
   - If changing API: Update decorators, run `make open-api` to regenerate SDKs
   - If changing schema: Modify `server/src/schema/*.ts`, run `pnpm run migrations:generate`
   - Add tests in `server/test/`
   - Run `make check-server` and `make test-server`

2. **Web Changes**:

   - Ensure SDK is built: `make build-sdk`
   - Modify code in `web/src/`
   - Add tests in `web/src/lib/` co-located with components
   - Run `make check-web` and `make test-web`
   - For production builds: `cd web && pnpm run build`

3. **Mobile Changes**:

   - Modify code in `mobile/lib/`
   - Follow MVVM pattern: models, providers, services, UI, views
   - Update translations: Add to `i18n/en.json`, run `make translation` in mobile/
   - Run static analysis: `dart format lib && dart analyze && dart run custom_lint`

4. **Database Changes**:

   - Modify Kysely schema in `server/src/schema/`
   - Generate migration: `cd server && pnpm run migrations:generate`
   - Review generated SQL in `server/src/migrations/`
   - Test migration: `pnpm run migrations:run`

5. **API Changes**:
   - Update controller decorators for OpenAPI generation
   - Run `make open-api` to regenerate SDKs
   - Rebuild web/CLI: `make build-web build-cli`
   - Update E2E tests in `e2e/src/`

### Testing Strategy

- **Unit Tests**: Co-located with source files

  - Server: Vitest with mocked repositories
  - Web: Vitest + Testing Library
  - Mobile: Dart test framework

- **Integration Tests**: `server/test/` with real database via Testcontainers

  - Run with `make test-medium`

- **E2E Tests**: `e2e/src/` for API and `e2e/web/` for browser tests
  - API: Vitest with Supertest
  - Web: Playwright
  - Require Docker environment

## Key Conventions

### Server Patterns

**Service Pattern**: All services extend `BaseService` with automatic repository injection

```typescript
export class AssetService extends BaseService {
  // this.accessRepository, this.assetRepository, etc. auto-injected
}
```

**Job Handling**: Use decorators for queue workers

```typescript
@OnJob({ name: JobName.THUMBNAIL_GENERATION, queue: QueueName.THUMBNAIL_GENERATION })
async handleThumbnailGeneration(job: IEntityJob): Promise<JobStatus> {
  // Process job
}
```

**Event Handling**: Subscribe to events with decorators

```typescript
@OnEvent({ name: 'asset.created', server: true })
async handleAssetCreated(event: AssetCreateEvent) {
  // Handle event
}
```

**Repository Pattern**: Use Kysely for type-safe queries

```typescript
const assets = await this.db.selectFrom("assets").where("ownerId", "=", userId).selectAll().execute();
```

### Web Patterns

**Component Organization**:

- Components in `src/lib/components/`
- Modals in `src/lib/modals/`
- Stores in `src/lib/stores/`
- Utils in `src/lib/utils/`

**Svelte 5 Runes**: Use modern reactive syntax

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

**API Calls**: Use generated SDK from `@immich/sdk`

**Translations**: Add keys to `i18n/en.json`, use `$t()` in components

### Mobile Patterns

**Module Structure**: Follow MVVM template in `module_template/`

```
module_name/
  models/           # Data structures
  providers/        # Riverpod providers
  services/         # Business logic
  ui/              # Widgets
  views/           # Screens
```

**State Management**: Use Riverpod providers with code generation

```dart
@riverpod
class AssetNotifier extends _$AssetNotifier {
  @override
  FutureOr<List<Asset>> build() async {
    return await ref.read(assetServiceProvider).getAssets();
  }
}
```

**Routing**: Use AutoRoute with guards (auth, permissions)
