This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: server/src/*
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
server/
  src/
    app.module.ts
    config.ts
    constants.ts
    database.ts
    decorators.ts
    enum.ts
    main.ts
    types.ts
    validation.spec.ts
    validation.ts
```

# Files

## File: server/src/app.module.ts
```typescript
import { BullModule } from '@nestjs/bullmq';
import { Inject, Module, OnModuleDestroy, OnModuleInit, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { ClsModule } from 'nestjs-cls';
import { KyselyModule } from 'nestjs-kysely';
import { OpenTelemetryModule } from 'nestjs-otel';
import { commands } from 'src/commands';
import { IWorker } from 'src/constants';
import { controllers } from 'src/controllers';
import { ImmichWorker } from 'src/enum';
import { AuthGuard } from 'src/middleware/auth.guard';
import { ErrorInterceptor } from 'src/middleware/error.interceptor';
import { FileUploadInterceptor } from 'src/middleware/file-upload.interceptor';
import { GlobalExceptionFilter } from 'src/middleware/global-exception.filter';
import { LoggingInterceptor } from 'src/middleware/logging.interceptor';
import { repositories } from 'src/repositories';
import { ConfigRepository } from 'src/repositories/config.repository';
import { EventRepository } from 'src/repositories/event.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { teardownTelemetry, TelemetryRepository } from 'src/repositories/telemetry.repository';
import { services } from 'src/services';
import { AuthService } from 'src/services/auth.service';
import { CliService } from 'src/services/cli.service';
import { JobService } from 'src/services/job.service';
import { getKyselyConfig } from 'src/utils/database';
const common = [...repositories, ...services, GlobalExceptionFilter];
export const middleware = [
  FileUploadInterceptor,
  { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: ErrorInterceptor },
  { provide: APP_GUARD, useClass: AuthGuard },
];
const configRepository = new ConfigRepository();
const { bull, cls, database, otel } = configRepository.getEnv();
const imports = [
  BullModule.forRoot(bull.config),
  BullModule.registerQueue(...bull.queues),
  ClsModule.forRoot(cls.config),
  OpenTelemetryModule.forRoot(otel),
  KyselyModule.forRoot(getKyselyConfig(database.config)),
];
class BaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(IWorker) private worker: ImmichWorker,
    logger: LoggingRepository,
    private eventRepository: EventRepository,
    private jobService: JobService,
    private telemetryRepository: TelemetryRepository,
    private authService: AuthService,
  ) {
    logger.setAppName(this.worker);
  }
  async onModuleInit() {
    this.telemetryRepository.setup({ repositories });
    this.jobService.setServices(services);
    this.eventRepository.setAuthFn(async (client) =>
      this.authService.authenticate({
        headers: client.request.headers,
        queryParams: {},
        metadata: { adminRoute: false, sharedLinkRoute: false, uri: '/api/socket.io' },
      }),
    );
    this.eventRepository.setup({ services });
    await this.eventRepository.emit('app.bootstrap');
  }
  async onModuleDestroy() {
    await this.eventRepository.emit('app.shutdown');
    await teardownTelemetry();
  }
}
@Module({
  imports: [...imports, ScheduleModule.forRoot()],
  controllers: [...controllers],
  providers: [...common, ...middleware, { provide: IWorker, useValue: ImmichWorker.API }],
})
export class ApiModule extends BaseModule {}
@Module({
  imports: [...imports],
  providers: [...common, { provide: IWorker, useValue: ImmichWorker.MICROSERVICES }, SchedulerRegistry],
})
export class MicroservicesModule extends BaseModule {}
@Module({
  imports: [...imports],
  providers: [...common, ...commands, SchedulerRegistry],
})
export class ImmichAdminModule implements OnModuleDestroy {
  constructor(private service: CliService) {}
  async onModuleDestroy() {
    await this.service.cleanup();
  }
}
```

## File: server/src/config.ts
```typescript
import { CronExpression } from '@nestjs/schedule';
import {
  AudioCodec,
  Colorspace,
  CQMode,
  ImageFormat,
  LogLevel,
  OAuthTokenEndpointAuthMethod,
  QueueName,
  ToneMapping,
  TranscodeHWAccel,
  TranscodePolicy,
  VideoCodec,
  VideoContainer,
} from 'src/enum';
import { ConcurrentQueueName, FullsizeImageOptions, ImageOptions } from 'src/types';
export interface SystemConfig {
  backup: {
    database: {
      enabled: boolean;
      cronExpression: string;
      keepLastAmount: number;
    };
  };
  ffmpeg: {
    crf: number;
    threads: number;
    preset: string;
    targetVideoCodec: VideoCodec;
    acceptedVideoCodecs: VideoCodec[];
    targetAudioCodec: AudioCodec;
    acceptedAudioCodecs: AudioCodec[];
    acceptedContainers: VideoContainer[];
    targetResolution: string;
    maxBitrate: string;
    bframes: number;
    refs: number;
    gopSize: number;
    temporalAQ: boolean;
    cqMode: CQMode;
    twoPass: boolean;
    preferredHwDevice: string;
    transcode: TranscodePolicy;
    accel: TranscodeHWAccel;
    accelDecode: boolean;
    tonemap: ToneMapping;
  };
  job: Record<ConcurrentQueueName, { concurrency: number }>;
  logging: {
    enabled: boolean;
    level: LogLevel;
  };
  machineLearning: {
    enabled: boolean;
    urls: string[];
    clip: {
      enabled: boolean;
      modelName: string;
    };
    duplicateDetection: {
      enabled: boolean;
      maxDistance: number;
    };
    facialRecognition: {
      enabled: boolean;
      modelName: string;
      minScore: number;
      minFaces: number;
      maxDistance: number;
    };
  };
  map: {
    enabled: boolean;
    lightStyle: string;
    darkStyle: string;
  };
  reverseGeocoding: {
    enabled: boolean;
  };
  metadata: {
    faces: {
      import: boolean;
    };
  };
  oauth: {
    autoLaunch: boolean;
    autoRegister: boolean;
    buttonText: string;
    clientId: string;
    clientSecret: string;
    defaultStorageQuota: number | null;
    enabled: boolean;
    issuerUrl: string;
    mobileOverrideEnabled: boolean;
    mobileRedirectUri: string;
    scope: string;
    signingAlgorithm: string;
    profileSigningAlgorithm: string;
    tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
    timeout: number;
    storageLabelClaim: string;
    storageQuotaClaim: string;
  };
  passwordLogin: {
    enabled: boolean;
  };
  storageTemplate: {
    enabled: boolean;
    hashVerificationEnabled: boolean;
    template: string;
  };
  image: {
    thumbnail: ImageOptions;
    preview: ImageOptions;
    colorspace: Colorspace;
    extractEmbedded: boolean;
    fullsize: FullsizeImageOptions;
  };
  newVersionCheck: {
    enabled: boolean;
  };
  trash: {
    enabled: boolean;
    days: number;
  };
  theme: {
    customCss: string;
  };
  library: {
    scan: {
      enabled: boolean;
      cronExpression: string;
    };
    watch: {
      enabled: boolean;
    };
  };
  notifications: {
    smtp: {
      enabled: boolean;
      from: string;
      replyTo: string;
      transport: {
        ignoreCert: boolean;
        host: string;
        port: number;
        username: string;
        password: string;
      };
    };
  };
  templates: {
    email: {
      welcomeTemplate: string;
      albumInviteTemplate: string;
      albumUpdateTemplate: string;
    };
  };
  server: {
    externalDomain: string;
    loginPageMessage: string;
    publicUsers: boolean;
  };
  user: {
    deleteDelay: number;
  };
}
export const defaults = Object.freeze<SystemConfig>({
  backup: {
    database: {
      enabled: true,
      cronExpression: CronExpression.EVERY_DAY_AT_2AM,
      keepLastAmount: 14,
    },
  },
  ffmpeg: {
    crf: 23,
    threads: 0,
    preset: 'ultrafast',
    targetVideoCodec: VideoCodec.H264,
    acceptedVideoCodecs: [VideoCodec.H264],
    targetAudioCodec: AudioCodec.AAC,
    acceptedAudioCodecs: [AudioCodec.AAC, AudioCodec.MP3, AudioCodec.LIBOPUS, AudioCodec.PCMS16LE],
    acceptedContainers: [VideoContainer.MOV, VideoContainer.OGG, VideoContainer.WEBM],
    targetResolution: '720',
    maxBitrate: '0',
    bframes: -1,
    refs: 0,
    gopSize: 0,
    temporalAQ: false,
    cqMode: CQMode.AUTO,
    twoPass: false,
    preferredHwDevice: 'auto',
    transcode: TranscodePolicy.REQUIRED,
    tonemap: ToneMapping.HABLE,
    accel: TranscodeHWAccel.DISABLED,
    accelDecode: false,
  },
  job: {
    [QueueName.BACKGROUND_TASK]: { concurrency: 5 },
    [QueueName.SMART_SEARCH]: { concurrency: 2 },
    [QueueName.METADATA_EXTRACTION]: { concurrency: 5 },
    [QueueName.FACE_DETECTION]: { concurrency: 2 },
    [QueueName.SEARCH]: { concurrency: 5 },
    [QueueName.SIDECAR]: { concurrency: 5 },
    [QueueName.LIBRARY]: { concurrency: 5 },
    [QueueName.MIGRATION]: { concurrency: 5 },
    [QueueName.THUMBNAIL_GENERATION]: { concurrency: 3 },
    [QueueName.VIDEO_CONVERSION]: { concurrency: 1 },
    [QueueName.NOTIFICATION]: { concurrency: 5 },
  },
  logging: {
    enabled: true,
    level: LogLevel.LOG,
  },
  machineLearning: {
    enabled: process.env.IMMICH_MACHINE_LEARNING_ENABLED !== 'false',
    urls: [process.env.IMMICH_MACHINE_LEARNING_URL || 'http://immich-machine-learning:3003'],
    clip: {
      enabled: true,
      modelName: 'ViT-B-32__openai',
    },
    duplicateDetection: {
      enabled: true,
      maxDistance: 0.01,
    },
    facialRecognition: {
      enabled: true,
      modelName: 'buffalo_l',
      minScore: 0.7,
      maxDistance: 0.5,
      minFaces: 3,
    },
  },
  map: {
    enabled: true,
    lightStyle: 'https://tiles.immich.cloud/v1/style/light.json',
    darkStyle: 'https://tiles.immich.cloud/v1/style/dark.json',
  },
  reverseGeocoding: {
    enabled: true,
  },
  metadata: {
    faces: {
      import: false,
    },
  },
  oauth: {
    autoLaunch: false,
    autoRegister: true,
    buttonText: 'Login with OAuth',
    clientId: '',
    clientSecret: '',
    defaultStorageQuota: null,
    enabled: false,
    issuerUrl: '',
    mobileOverrideEnabled: false,
    mobileRedirectUri: '',
    scope: 'openid email profile',
    signingAlgorithm: 'RS256',
    profileSigningAlgorithm: 'none',
    storageLabelClaim: 'preferred_username',
    storageQuotaClaim: 'immich_quota',
    tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod.CLIENT_SECRET_POST,
    timeout: 30_000,
  },
  passwordLogin: {
    enabled: true,
  },
  storageTemplate: {
    enabled: false,
    hashVerificationEnabled: true,
    template: '{{y}}/{{y}}-{{MM}}-{{dd}}/{{filename}}',
  },
  image: {
    thumbnail: {
      format: ImageFormat.WEBP,
      size: 250,
      quality: 80,
    },
    preview: {
      format: ImageFormat.JPEG,
      size: 1440,
      quality: 80,
    },
    colorspace: Colorspace.P3,
    extractEmbedded: false,
    fullsize: {
      enabled: false,
      format: ImageFormat.JPEG,
      quality: 80,
    },
  },
  newVersionCheck: {
    enabled: true,
  },
  trash: {
    enabled: true,
    days: 30,
  },
  theme: {
    customCss: '',
  },
  library: {
    scan: {
      enabled: true,
      cronExpression: CronExpression.EVERY_DAY_AT_MIDNIGHT,
    },
    watch: {
      enabled: false,
    },
  },
  server: {
    externalDomain: '',
    loginPageMessage: '',
    publicUsers: true,
  },
  notifications: {
    smtp: {
      enabled: false,
      from: '',
      replyTo: '',
      transport: {
        ignoreCert: false,
        host: '',
        port: 587,
        username: '',
        password: '',
      },
    },
  },
  templates: {
    email: {
      welcomeTemplate: '',
      albumInviteTemplate: '',
      albumUpdateTemplate: '',
    },
  },
  user: {
    deleteDelay: 7,
  },
});
```

## File: server/src/constants.ts
```typescript
import { Duration } from 'luxon';
import { readFileSync } from 'node:fs';
import { SemVer } from 'semver';
import { DatabaseExtension, ExifOrientation, VectorIndex } from 'src/enum';
export const POSTGRES_VERSION_RANGE = '>=14.0.0';
export const VECTORCHORD_VERSION_RANGE = '>=0.3 <0.5';
export const VECTORS_VERSION_RANGE = '>=0.2 <0.4';
export const VECTOR_VERSION_RANGE = '>=0.5 <1';
export const NEXT_RELEASE = 'NEXT_RELEASE';
export const LIFECYCLE_EXTENSION = 'x-immich-lifecycle';
export const DEPRECATED_IN_PREFIX = 'This property was deprecated in ';
export const ADDED_IN_PREFIX = 'This property was added in ';
export const JOBS_ASSET_PAGINATION_SIZE = 1000;
export const JOBS_LIBRARY_PAGINATION_SIZE = 10_000;
export const EXTENSION_NAMES: Record<DatabaseExtension, string> = {
  cube: 'cube',
  earthdistance: 'earthdistance',
  vector: 'pgvector',
  vectors: 'pgvecto.rs',
  vchord: 'VectorChord',
} as const;
export const VECTOR_EXTENSIONS = [
  DatabaseExtension.VECTORCHORD,
  DatabaseExtension.VECTORS,
  DatabaseExtension.VECTOR,
] as const;
export const VECTOR_INDEX_TABLES = {
  [VectorIndex.CLIP]: 'smart_search',
  [VectorIndex.FACE]: 'face_search',
} as const;
export const VECTORCHORD_LIST_SLACK_FACTOR = 1.2;
export const SALT_ROUNDS = 10;
export const IWorker = 'IWorker';
const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));
export const serverVersion = new SemVer(version);
export const AUDIT_LOG_MAX_DURATION = Duration.fromObject({ days: 100 });
export const ONE_HOUR = Duration.fromObject({ hours: 1 });
export const APP_MEDIA_LOCATION = process.env.IMMICH_MEDIA_LOCATION || './upload';
export const MACHINE_LEARNING_PING_TIMEOUT = Number(process.env.MACHINE_LEARNING_PING_TIMEOUT || 2000);
export const MACHINE_LEARNING_AVAILABILITY_BACKOFF_TIME = Number(
  process.env.MACHINE_LEARNING_AVAILABILITY_BACKOFF_TIME || 30_000,
);
export const citiesFile = 'cities500.txt';
export const MOBILE_REDIRECT = 'app.immich:///oauth-callback';
export const LOGIN_URL = '/auth/login?autoLaunch=0';
export const excludePaths = ['/.well-known/immich', '/custom.css', '/favicon.ico'];
export const FACE_THUMBNAIL_SIZE = 250;
type ModelInfo = { dimSize: number };
export const CLIP_MODEL_INFO: Record<string, ModelInfo> = {
  RN101__openai: { dimSize: 512 },
  RN101__yfcc15m: { dimSize: 512 },
  'ViT-B-16__laion400m_e31': { dimSize: 512 },
  'ViT-B-16__laion400m_e32': { dimSize: 512 },
  'ViT-B-16__openai': { dimSize: 512 },
  'ViT-B-32__laion2b-s34b-b79k': { dimSize: 512 },
  'ViT-B-32__laion2b_e16': { dimSize: 512 },
  'ViT-B-32__laion400m_e31': { dimSize: 512 },
  'ViT-B-32__laion400m_e32': { dimSize: 512 },
  'ViT-B-32__openai': { dimSize: 512 },
  'XLM-Roberta-Base-ViT-B-32__laion5b_s13b_b90k': { dimSize: 512 },
  'XLM-Roberta-Large-Vit-B-32': { dimSize: 512 },
  RN50x4__openai: { dimSize: 640 },
  'ViT-B-16-plus-240__laion400m_e31': { dimSize: 640 },
  'ViT-B-16-plus-240__laion400m_e32': { dimSize: 640 },
  'XLM-Roberta-Large-Vit-B-16Plus': { dimSize: 640 },
  'LABSE-Vit-L-14': { dimSize: 768 },
  RN50x16__openai: { dimSize: 768 },
  'ViT-B-16-SigLIP-256__webli': { dimSize: 768 },
  'ViT-B-16-SigLIP-384__webli': { dimSize: 768 },
  'ViT-B-16-SigLIP-512__webli': { dimSize: 768 },
  'ViT-B-16-SigLIP-i18n-256__webli': { dimSize: 768 },
  'ViT-B-16-SigLIP__webli': { dimSize: 768 },
  'ViT-L-14-336__openai': { dimSize: 768 },
  'ViT-L-14-quickgelu__dfn2b': { dimSize: 768 },
  'ViT-L-14__laion2b-s32b-b82k': { dimSize: 768 },
  'ViT-L-14__laion400m_e31': { dimSize: 768 },
  'ViT-L-14__laion400m_e32': { dimSize: 768 },
  'ViT-L-14__openai': { dimSize: 768 },
  'XLM-Roberta-Large-Vit-L-14': { dimSize: 768 },
  'nllb-clip-base-siglip__mrl': { dimSize: 768 },
  'nllb-clip-base-siglip__v1': { dimSize: 768 },
  RN50__cc12m: { dimSize: 1024 },
  RN50__openai: { dimSize: 1024 },
  RN50__yfcc15m: { dimSize: 1024 },
  RN50x64__openai: { dimSize: 1024 },
  'ViT-H-14-378-quickgelu__dfn5b': { dimSize: 1024 },
  'ViT-H-14-quickgelu__dfn5b': { dimSize: 1024 },
  'ViT-H-14__laion2b-s32b-b79k': { dimSize: 1024 },
  'ViT-L-16-SigLIP-256__webli': { dimSize: 1024 },
  'ViT-L-16-SigLIP-384__webli': { dimSize: 1024 },
  'ViT-g-14__laion2b-s12b-b42k': { dimSize: 1024 },
  'XLM-Roberta-Large-ViT-H-14__frozen_laion5b_s13b_b90k': { dimSize: 1024 },
  'ViT-SO400M-14-SigLIP-384__webli': { dimSize: 1152 },
  'nllb-clip-large-siglip__mrl': { dimSize: 1152 },
  'nllb-clip-large-siglip__v1': { dimSize: 1152 },
  'ViT-B-16-SigLIP2__webli': { dimSize: 768 },
  'ViT-B-32-SigLIP2-256__webli': { dimSize: 768 },
  'ViT-L-16-SigLIP2-256__webli': { dimSize: 1024 },
  'ViT-L-16-SigLIP2-384__webli': { dimSize: 1024 },
  'ViT-L-16-SigLIP2-512__webli': { dimSize: 1024 },
  'ViT-SO400M-14-SigLIP2__webli': { dimSize: 1152 },
  'ViT-SO400M-14-SigLIP2-378__webli': { dimSize: 1152 },
  'ViT-SO400M-16-SigLIP2-256__webli': { dimSize: 1152 },
  'ViT-SO400M-16-SigLIP2-384__webli': { dimSize: 1152 },
  'ViT-SO400M-16-SigLIP2-512__webli': { dimSize: 1152 },
  'ViT-gopt-16-SigLIP2-256__webli': { dimSize: 1536 },
  'ViT-gopt-16-SigLIP2-384__webli': { dimSize: 1536 },
};
type SharpRotationData = {
  angle?: number;
  flip?: boolean;
  flop?: boolean;
};
export const ORIENTATION_TO_SHARP_ROTATION: Record<ExifOrientation, SharpRotationData> = {
  [ExifOrientation.Horizontal]: { angle: 0 },
  [ExifOrientation.MirrorHorizontal]: { angle: 0, flop: true },
  [ExifOrientation.Rotate180]: { angle: 180 },
  [ExifOrientation.MirrorVertical]: { angle: 180, flop: true },
  [ExifOrientation.MirrorHorizontalRotate270CW]: { angle: 270, flip: true },
  [ExifOrientation.Rotate90CW]: { angle: 90 },
  [ExifOrientation.MirrorHorizontalRotate90CW]: { angle: 90, flip: true },
  [ExifOrientation.Rotate270CW]: { angle: 270 },
} as const;
```

## File: server/src/database.ts
```typescript
import { Selectable } from 'kysely';
import { MapAsset } from 'src/dtos/asset-response.dto';
import {
  AlbumUserRole,
  AssetFileType,
  AssetType,
  AssetVisibility,
  MemoryType,
  Permission,
  SharedLinkType,
  SourceType,
  UserAvatarColor,
  UserStatus,
} from 'src/enum';
import { AlbumTable } from 'src/schema/tables/album.table';
import { ExifTable } from 'src/schema/tables/exif.table';
import { UserMetadataItem } from 'src/types';
export type AuthUser = {
  id: string;
  isAdmin: boolean;
  name: string;
  email: string;
  quotaUsageInBytes: number;
  quotaSizeInBytes: number | null;
};
export type AlbumUser = {
  user: User;
  role: AlbumUserRole;
};
export type AssetFile = {
  id: string;
  type: AssetFileType;
  path: string;
};
export type Library = {
  id: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  updateId: string;
  name: string;
  importPaths: string[];
  exclusionPatterns: string[];
  deletedAt: Date | null;
  refreshedAt: Date | null;
  assets?: MapAsset[];
};
export type AuthApiKey = {
  id: string;
  permissions: Permission[];
};
export type Activity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  albumId: string;
  userId: string;
  user: User;
  assetId: string | null;
  comment: string | null;
  isLiked: boolean;
  updateId: string;
};
export type ApiKey = {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: Permission[];
};
export type Tag = {
  id: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
  color: string | null;
  parentId: string | null;
};
export type Memory = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  memoryAt: Date;
  seenAt: Date | null;
  showAt: Date | null;
  hideAt: Date | null;
  type: MemoryType;
  data: object;
  ownerId: string;
  isSaved: boolean;
  assets: MapAsset[];
};
export type Asset = {
  id: string;
  checksum: Buffer<ArrayBufferLike>;
  deviceAssetId: string;
  deviceId: string;
  fileCreatedAt: Date;
  fileModifiedAt: Date;
  isExternal: boolean;
  visibility: AssetVisibility;
  libraryId: string | null;
  livePhotoVideoId: string | null;
  localDateTime: Date;
  originalFileName: string;
  originalPath: string;
  ownerId: string;
  sidecarPath: string | null;
  type: AssetType;
};
export type User = {
  id: string;
  name: string;
  email: string;
  avatarColor: UserAvatarColor | null;
  profileImagePath: string;
  profileChangedAt: Date;
};
export type UserAdmin = User & {
  storageLabel: string | null;
  shouldChangePassword: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  oauthId: string;
  quotaSizeInBytes: number | null;
  quotaUsageInBytes: number;
  status: UserStatus;
  metadata: UserMetadataItem[];
};
export type StorageAsset = {
  id: string;
  ownerId: string;
  files: AssetFile[];
  encodedVideoPath: string | null;
};
export type SidecarWriteAsset = {
  id: string;
  sidecarPath: string | null;
  originalPath: string;
  tags: Array<{ value: string }>;
};
export type Stack = {
  id: string;
  primaryAssetId: string;
  owner?: User;
  ownerId: string;
  assets: MapAsset[];
  assetCount?: number;
};
export type AuthSharedLink = {
  id: string;
  expiresAt: Date | null;
  userId: string;
  showExif: boolean;
  allowUpload: boolean;
  allowDownload: boolean;
  password: string | null;
};
export type SharedLink = {
  id: string;
  album?: Album | null;
  albumId: string | null;
  allowDownload: boolean;
  allowUpload: boolean;
  assets: MapAsset[];
  createdAt: Date;
  description: string | null;
  expiresAt: Date | null;
  key: Buffer;
  password: string | null;
  showExif: boolean;
  type: SharedLinkType;
  userId: string;
};
export type Album = Selectable<AlbumTable> & {
  owner: User;
  assets: MapAsset[];
};
export type AuthSession = {
  id: string;
  hasElevatedPermission: boolean;
};
export type Partner = {
  sharedById: string;
  sharedBy: User;
  sharedWithId: string;
  sharedWith: User;
  createdAt: Date;
  createId: string;
  updatedAt: Date;
  updateId: string;
  inTimeline: boolean;
};
export type Place = {
  admin1Code: string | null;
  admin1Name: string | null;
  admin2Code: string | null;
  admin2Name: string | null;
  alternateNames: string | null;
  countryCode: string;
  id: number;
  latitude: number;
  longitude: number;
  modificationDate: Date;
  name: string;
};
export type Session = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  deviceOS: string;
  deviceType: string;
  pinExpiresAt: Date | null;
};
export type Exif = Omit<Selectable<ExifTable>, 'updatedAt' | 'updateId'>;
export type Person = {
  createdAt: Date;
  id: string;
  ownerId: string;
  updatedAt: Date;
  updateId: string;
  isFavorite: boolean;
  name: string;
  birthDate: Date | null;
  color: string | null;
  faceAssetId: string | null;
  isHidden: boolean;
  thumbnailPath: string;
};
export type AssetFace = {
  id: string;
  deletedAt: Date | null;
  assetId: string;
  boundingBoxX1: number;
  boundingBoxX2: number;
  boundingBoxY1: number;
  boundingBoxY2: number;
  imageHeight: number;
  imageWidth: number;
  personId: string | null;
  sourceType: SourceType;
  person?: Person | null;
};
const userColumns = ['id', 'name', 'email', 'avatarColor', 'profileImagePath', 'profileChangedAt'] as const;
const userWithPrefixColumns = [
  'users.id',
  'users.name',
  'users.email',
  'users.avatarColor',
  'users.profileImagePath',
  'users.profileChangedAt',
] as const;
export const columns = {
  asset: [
    'assets.id',
    'assets.checksum',
    'assets.deviceAssetId',
    'assets.deviceId',
    'assets.fileCreatedAt',
    'assets.fileModifiedAt',
    'assets.isExternal',
    'assets.visibility',
    'assets.libraryId',
    'assets.livePhotoVideoId',
    'assets.localDateTime',
    'assets.originalFileName',
    'assets.originalPath',
    'assets.ownerId',
    'assets.sidecarPath',
    'assets.type',
  ],
  assetFiles: ['asset_files.id', 'asset_files.path', 'asset_files.type'],
  authUser: [
    'users.id',
    'users.name',
    'users.email',
    'users.isAdmin',
    'users.quotaUsageInBytes',
    'users.quotaSizeInBytes',
  ],
  authApiKey: ['api_keys.id', 'api_keys.permissions'],
  authSession: ['sessions.id', 'sessions.updatedAt', 'sessions.pinExpiresAt'],
  authSharedLink: [
    'shared_links.id',
    'shared_links.userId',
    'shared_links.expiresAt',
    'shared_links.showExif',
    'shared_links.allowUpload',
    'shared_links.allowDownload',
    'shared_links.password',
  ],
  user: userColumns,
  userWithPrefix: userWithPrefixColumns,
  userAdmin: [
    ...userColumns,
    'createdAt',
    'updatedAt',
    'deletedAt',
    'isAdmin',
    'status',
    'oauthId',
    'profileImagePath',
    'shouldChangePassword',
    'storageLabel',
    'quotaSizeInBytes',
    'quotaUsageInBytes',
  ],
  tag: ['tags.id', 'tags.value', 'tags.createdAt', 'tags.updatedAt', 'tags.color', 'tags.parentId'],
  apiKey: ['id', 'name', 'userId', 'createdAt', 'updatedAt', 'permissions'],
  notification: ['id', 'createdAt', 'level', 'type', 'title', 'description', 'data', 'readAt'],
  syncAsset: [
    'assets.id',
    'assets.ownerId',
    'assets.originalFileName',
    'assets.thumbhash',
    'assets.checksum',
    'assets.fileCreatedAt',
    'assets.fileModifiedAt',
    'assets.localDateTime',
    'assets.type',
    'assets.deletedAt',
    'assets.isFavorite',
    'assets.visibility',
    'assets.duration',
  ],
  syncAlbumUser: ['album_users.albumsId as albumId', 'album_users.usersId as userId', 'album_users.role'],
  syncStack: [
    'asset_stack.id',
    'asset_stack.createdAt',
    'asset_stack.updatedAt',
    'asset_stack.primaryAssetId',
    'asset_stack.ownerId',
  ],
  stack: ['stack.id', 'stack.primaryAssetId', 'ownerId'],
  syncAssetExif: [
    'exif.assetId',
    'exif.description',
    'exif.exifImageWidth',
    'exif.exifImageHeight',
    'exif.fileSizeInByte',
    'exif.orientation',
    'exif.dateTimeOriginal',
    'exif.modifyDate',
    'exif.timeZone',
    'exif.latitude',
    'exif.longitude',
    'exif.projectionType',
    'exif.city',
    'exif.state',
    'exif.country',
    'exif.make',
    'exif.model',
    'exif.lensModel',
    'exif.fNumber',
    'exif.focalLength',
    'exif.iso',
    'exif.exposureTime',
    'exif.profileDescription',
    'exif.rating',
    'exif.fps',
  ],
  exif: [
    'exif.assetId',
    'exif.autoStackId',
    'exif.bitsPerSample',
    'exif.city',
    'exif.colorspace',
    'exif.country',
    'exif.dateTimeOriginal',
    'exif.description',
    'exif.exifImageHeight',
    'exif.exifImageWidth',
    'exif.exposureTime',
    'exif.fileSizeInByte',
    'exif.fNumber',
    'exif.focalLength',
    'exif.fps',
    'exif.iso',
    'exif.latitude',
    'exif.lensModel',
    'exif.livePhotoCID',
    'exif.longitude',
    'exif.make',
    'exif.model',
    'exif.modifyDate',
    'exif.orientation',
    'exif.profileDescription',
    'exif.projectionType',
    'exif.rating',
    'exif.state',
    'exif.timeZone',
  ],
} as const;
```

## File: server/src/decorators.ts
```typescript
import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import _ from 'lodash';
import { ADDED_IN_PREFIX, DEPRECATED_IN_PREFIX, LIFECYCLE_EXTENSION } from 'src/constants';
import { ImmichWorker, JobName, MetadataKey, QueueName } from 'src/enum';
import { EmitEvent } from 'src/repositories/event.repository';
import { immich_uuid_v7, updated_at } from 'src/schema/functions';
import { BeforeUpdateTrigger, Column, ColumnOptions } from 'src/sql-tools';
import { setUnion } from 'src/utils/set';
const GeneratedUuidV7Column = (options: Omit<ColumnOptions, 'type' | 'default' | 'nullable'> = {}) =>
  Column({ ...options, type: 'uuid', nullable: false, default: () => `${immich_uuid_v7.name}()` });
export const UpdateIdColumn = (options: Omit<ColumnOptions, 'type' | 'default' | 'nullable'> = {}) =>
  GeneratedUuidV7Column(options);
export const CreateIdColumn = (options: Omit<ColumnOptions, 'type' | 'default' | 'nullable'> = {}) =>
  GeneratedUuidV7Column(options);
export const PrimaryGeneratedUuidV7Column = () => GeneratedUuidV7Column({ primary: true });
export const UpdatedAtTrigger = (name: string) =>
  BeforeUpdateTrigger({
    name,
    scope: 'row',
    function: updated_at,
  });
// PostgreSQL uses a 16-bit integer to indicate the number of bound parameters. This means that the
// maximum number of parameters is 65535. Any query that tries to bind more than that (e.g. searching
// by a list of IDs) requires splitting the query into multiple chunks.
// We are rounding down this limit, as queries commonly include other filters and parameters.
export const DATABASE_PARAMETER_CHUNK_SIZE = 65_500;
/**
 * Chunks an array or set into smaller collections of the same type and specified size.
 *
 * @param collection The collection to chunk.
 * @param size The size of each chunk.
 */
function chunks<T>(collection: Array<T>, size: number): Array<Array<T>>;
function chunks<T>(collection: Set<T>, size: number): Array<Set<T>>;
function chunks<T>(collection: Array<T> | Set<T>, size: number): Array<Array<T>> | Array<Set<T>> {
  if (collection instanceof Set) {
    const result = [];
    let chunk = new Set<T>();
    for (const element of collection) {
      chunk.add(element);
      if (chunk.size === size) {
        result.push(chunk);
        chunk = new Set<T>();
      }
    }
    if (chunk.size > 0) {
      result.push(chunk);
    }
    return result;
  } else {
    return _.chunk(collection, size);
  }
}
/**
 * Wraps a method that takes a collection of parameters and sequentially calls it with chunks of the collection,
 * to overcome the maximum number of parameters allowed by the database driver.
 *
 * @param options.paramIndex The index of the function parameter to chunk. Defaults to 0.
 * @param options.flatten Whether to flatten the results. Defaults to false.
 */
export function Chunked(
  options: { paramIndex?: number; chunkSize?: number; mergeFn?: (results: any) => any } = {},
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const parameterIndex = options.paramIndex ?? 0;
    const chunkSize = options.chunkSize || DATABASE_PARAMETER_CHUNK_SIZE;
    descriptor.value = async function (...arguments_: any[]) {
      const argument = arguments_[parameterIndex];
      // Early return if argument length is less than or equal to the chunk size.
      if (
        (Array.isArray(argument) && argument.length <= chunkSize) ||
        (argument instanceof Set && argument.size <= chunkSize)
      ) {
        return await originalMethod.apply(this, arguments_);
      }
      return Promise.all(
        chunks(argument, chunkSize).map(async (chunk) => {
          await Reflect.apply(originalMethod, this, [
            ...arguments_.slice(0, parameterIndex),
            chunk,
            ...arguments_.slice(parameterIndex + 1),
          ]);
        }),
      ).then((results) => (options.mergeFn ? options.mergeFn(results) : results));
    };
  };
}
export function ChunkedArray(options?: { paramIndex?: number }): MethodDecorator {
  return Chunked({ ...options, mergeFn: _.flatten });
}
export function ChunkedSet(options?: { paramIndex?: number }): MethodDecorator {
  return Chunked({ ...options, mergeFn: setUnion });
}
const UUID = '00000000-0000-4000-a000-000000000000';
export const DummyValue = {
  UUID,
  UUID_SET: new Set([UUID]),
  PAGINATION: { take: 10, skip: 0 },
  EMAIL: 'user@immich.app',
  STRING: 'abcdefghi',
  NUMBER: 50,
  BUFFER: Buffer.from('abcdefghi'),
  DATE: new Date(),
  TIME_BUCKET: '2024-01-01T00:00:00.000Z',
  BOOLEAN: true,
  VECTOR: JSON.stringify(Array.from({ length: 512 }, () => 0)),
};
export const GENERATE_SQL_KEY = 'generate-sql-key';
export interface GenerateSqlQueries {
  name?: string;
  params: unknown[];
  stream?: boolean;
}
export const Telemetry = (options: { enabled?: boolean }) =>
  SetMetadata(MetadataKey.TELEMETRY_ENABLED, options?.enabled ?? true);
/** Decorator to enable versioning/tracking of generated Sql */
export const GenerateSql = (...options: GenerateSqlQueries[]) => SetMetadata(GENERATE_SQL_KEY, options);
export type EventConfig = {
  name: EmitEvent;
  /** handle socket.io server events as well  */
  server?: boolean;
  /** lower value has higher priority, defaults to 0 */
  priority?: number;
  /** register events for these workers, defaults to all workers */
  workers?: ImmichWorker[];
};
export const OnEvent = (config: EventConfig) => SetMetadata(MetadataKey.EVENT_CONFIG, config);
export type JobConfig = {
  name: JobName;
  queue: QueueName;
};
export const OnJob = (config: JobConfig) => SetMetadata(MetadataKey.JOB_CONFIG, config);
type LifecycleRelease = 'NEXT_RELEASE' | string;
type LifecycleMetadata = {
  addedAt?: LifecycleRelease;
  deprecatedAt?: LifecycleRelease;
};
export const EndpointLifecycle = ({ addedAt, deprecatedAt }: LifecycleMetadata) => {
  const decorators: MethodDecorator[] = [ApiExtension(LIFECYCLE_EXTENSION, { addedAt, deprecatedAt })];
  if (deprecatedAt) {
    decorators.push(
      ApiTags('Deprecated'),
      ApiOperation({ deprecated: true, description: DEPRECATED_IN_PREFIX + deprecatedAt }),
    );
  }
  return applyDecorators(...decorators);
};
export const PropertyLifecycle = ({ addedAt, deprecatedAt }: LifecycleMetadata) => {
  const decorators: PropertyDecorator[] = [];
  decorators.push(ApiProperty({ description: ADDED_IN_PREFIX + addedAt }));
  if (deprecatedAt) {
    decorators.push(ApiProperty({ deprecated: true, description: DEPRECATED_IN_PREFIX + deprecatedAt }));
  }
  return applyDecorators(...decorators);
};
```

## File: server/src/enum.ts
```typescript
export enum AuthType {
  PASSWORD = 'password',
  OAUTH = 'oauth',
}
export enum ImmichCookie {
  ACCESS_TOKEN = 'immich_access_token',
  AUTH_TYPE = 'immich_auth_type',
  IS_AUTHENTICATED = 'immich_is_authenticated',
  SHARED_LINK_TOKEN = 'immich_shared_link_token',
  OAUTH_STATE = 'immich_oauth_state',
  OAUTH_CODE_VERIFIER = 'immich_oauth_code_verifier',
}
export enum ImmichHeader {
  API_KEY = 'x-api-key',
  USER_TOKEN = 'x-immich-user-token',
  SESSION_TOKEN = 'x-immich-session-token',
  SHARED_LINK_KEY = 'x-immich-share-key',
  CHECKSUM = 'x-immich-checksum',
  CID = 'x-immich-cid',
}
export enum ImmichQuery {
  SHARED_LINK_KEY = 'key',
  API_KEY = 'apiKey',
  SESSION_KEY = 'sessionKey',
}
export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER',
}
export enum AssetFileType {
  /**
   * An full/large-size image extracted/converted from RAW photos
   */
  FULLSIZE = 'fullsize',
  PREVIEW = 'preview',
  THUMBNAIL = 'thumbnail',
}
export enum AlbumUserRole {
  EDITOR = 'editor',
  VIEWER = 'viewer',
}
export enum AssetOrder {
  ASC = 'asc',
  DESC = 'desc',
}
export enum DatabaseAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
export enum EntityType {
  ASSET = 'ASSET',
  ALBUM = 'ALBUM',
}
export enum MemoryType {
  /** pictures taken on this day X years ago */
  ON_THIS_DAY = 'on_this_day',
}
export enum Permission {
  ALL = 'all',
  ACTIVITY_CREATE = 'activity.create',
  ACTIVITY_READ = 'activity.read',
  ACTIVITY_UPDATE = 'activity.update',
  ACTIVITY_DELETE = 'activity.delete',
  ACTIVITY_STATISTICS = 'activity.statistics',
  API_KEY_CREATE = 'apiKey.create',
  API_KEY_READ = 'apiKey.read',
  API_KEY_UPDATE = 'apiKey.update',
  API_KEY_DELETE = 'apiKey.delete',
  // ASSET_CREATE = 'asset.create',
  ASSET_READ = 'asset.read',
  ASSET_UPDATE = 'asset.update',
  ASSET_DELETE = 'asset.delete',
  ASSET_SHARE = 'asset.share',
  ASSET_VIEW = 'asset.view',
  ASSET_DOWNLOAD = 'asset.download',
  ASSET_UPLOAD = 'asset.upload',
  ALBUM_CREATE = 'album.create',
  ALBUM_READ = 'album.read',
  ALBUM_UPDATE = 'album.update',
  ALBUM_DELETE = 'album.delete',
  ALBUM_STATISTICS = 'album.statistics',
  ALBUM_ADD_ASSET = 'album.addAsset',
  ALBUM_REMOVE_ASSET = 'album.removeAsset',
  ALBUM_SHARE = 'album.share',
  ALBUM_DOWNLOAD = 'album.download',
  AUTH_DEVICE_DELETE = 'authDevice.delete',
  ARCHIVE_READ = 'archive.read',
  FACE_CREATE = 'face.create',
  FACE_READ = 'face.read',
  FACE_UPDATE = 'face.update',
  FACE_DELETE = 'face.delete',
  LIBRARY_CREATE = 'library.create',
  LIBRARY_READ = 'library.read',
  LIBRARY_UPDATE = 'library.update',
  LIBRARY_DELETE = 'library.delete',
  LIBRARY_STATISTICS = 'library.statistics',
  TIMELINE_READ = 'timeline.read',
  TIMELINE_DOWNLOAD = 'timeline.download',
  MEMORY_CREATE = 'memory.create',
  MEMORY_READ = 'memory.read',
  MEMORY_UPDATE = 'memory.update',
  MEMORY_DELETE = 'memory.delete',
  NOTIFICATION_CREATE = 'notification.create',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_UPDATE = 'notification.update',
  NOTIFICATION_DELETE = 'notification.delete',
  PARTNER_CREATE = 'partner.create',
  PARTNER_READ = 'partner.read',
  PARTNER_UPDATE = 'partner.update',
  PARTNER_DELETE = 'partner.delete',
  PERSON_CREATE = 'person.create',
  PERSON_READ = 'person.read',
  PERSON_UPDATE = 'person.update',
  PERSON_DELETE = 'person.delete',
  PERSON_STATISTICS = 'person.statistics',
  PERSON_MERGE = 'person.merge',
  PERSON_REASSIGN = 'person.reassign',
  SESSION_CREATE = 'session.create',
  SESSION_READ = 'session.read',
  SESSION_UPDATE = 'session.update',
  SESSION_DELETE = 'session.delete',
  SESSION_LOCK = 'session.lock',
  SHARED_LINK_CREATE = 'sharedLink.create',
  SHARED_LINK_READ = 'sharedLink.read',
  SHARED_LINK_UPDATE = 'sharedLink.update',
  SHARED_LINK_DELETE = 'sharedLink.delete',
  STACK_CREATE = 'stack.create',
  STACK_READ = 'stack.read',
  STACK_UPDATE = 'stack.update',
  STACK_DELETE = 'stack.delete',
  SYSTEM_CONFIG_READ = 'systemConfig.read',
  SYSTEM_CONFIG_UPDATE = 'systemConfig.update',
  SYSTEM_METADATA_READ = 'systemMetadata.read',
  SYSTEM_METADATA_UPDATE = 'systemMetadata.update',
  TAG_CREATE = 'tag.create',
  TAG_READ = 'tag.read',
  TAG_UPDATE = 'tag.update',
  TAG_DELETE = 'tag.delete',
  TAG_ASSET = 'tag.asset',
  ADMIN_USER_CREATE = 'admin.user.create',
  ADMIN_USER_READ = 'admin.user.read',
  ADMIN_USER_UPDATE = 'admin.user.update',
  ADMIN_USER_DELETE = 'admin.user.delete',
}
export enum SharedLinkType {
  ALBUM = 'ALBUM',
  /**
   * Individual asset
   * or group of assets that are not in an album
   */
  INDIVIDUAL = 'INDIVIDUAL',
}
export enum StorageFolder {
  ENCODED_VIDEO = 'encoded-video',
  LIBRARY = 'library',
  UPLOAD = 'upload',
  PROFILE = 'profile',
  THUMBNAILS = 'thumbs',
  BACKUPS = 'backups',
}
export enum SystemMetadataKey {
  REVERSE_GEOCODING_STATE = 'reverse-geocoding-state',
  FACIAL_RECOGNITION_STATE = 'facial-recognition-state',
  MEMORIES_STATE = 'memories-state',
  ADMIN_ONBOARDING = 'admin-onboarding',
  SYSTEM_CONFIG = 'system-config',
  SYSTEM_FLAGS = 'system-flags',
  VERSION_CHECK_STATE = 'version-check-state',
  LICENSE = 'license',
}
export enum UserMetadataKey {
  PREFERENCES = 'preferences',
  LICENSE = 'license',
  ONBOARDING = 'onboarding',
}
export enum UserAvatarColor {
  PRIMARY = 'primary',
  PINK = 'pink',
  RED = 'red',
  YELLOW = 'yellow',
  BLUE = 'blue',
  GREEN = 'green',
  PURPLE = 'purple',
  ORANGE = 'orange',
  GRAY = 'gray',
  AMBER = 'amber',
}
export enum UserStatus {
  ACTIVE = 'active',
  REMOVING = 'removing',
  DELETED = 'deleted',
}
export enum AssetStatus {
  ACTIVE = 'active',
  TRASHED = 'trashed',
  DELETED = 'deleted',
}
export enum SourceType {
  MACHINE_LEARNING = 'machine-learning',
  EXIF = 'exif',
  MANUAL = 'manual',
}
export enum ManualJobName {
  PERSON_CLEANUP = 'person-cleanup',
  TAG_CLEANUP = 'tag-cleanup',
  USER_CLEANUP = 'user-cleanup',
  MEMORY_CLEANUP = 'memory-cleanup',
  MEMORY_CREATE = 'memory-create',
  BACKUP_DATABASE = 'backup-database',
}
export enum AssetPathType {
  ORIGINAL = 'original',
  FULLSIZE = 'fullsize',
  PREVIEW = 'preview',
  THUMBNAIL = 'thumbnail',
  ENCODED_VIDEO = 'encoded_video',
  SIDECAR = 'sidecar',
}
export enum PersonPathType {
  FACE = 'face',
}
export enum UserPathType {
  PROFILE = 'profile',
}
export type PathType = AssetPathType | PersonPathType | UserPathType;
export enum TranscodePolicy {
  ALL = 'all',
  OPTIMAL = 'optimal',
  BITRATE = 'bitrate',
  REQUIRED = 'required',
  DISABLED = 'disabled',
}
export enum TranscodeTarget {
  NONE,
  AUDIO,
  VIDEO,
  ALL,
}
export enum VideoCodec {
  H264 = 'h264',
  HEVC = 'hevc',
  VP9 = 'vp9',
  AV1 = 'av1',
}
export enum AudioCodec {
  MP3 = 'mp3',
  AAC = 'aac',
  LIBOPUS = 'libopus',
  PCMS16LE = 'pcm_s16le',
}
export enum VideoContainer {
  MOV = 'mov',
  MP4 = 'mp4',
  OGG = 'ogg',
  WEBM = 'webm',
}
export enum TranscodeHWAccel {
  NVENC = 'nvenc',
  QSV = 'qsv',
  VAAPI = 'vaapi',
  RKMPP = 'rkmpp',
  DISABLED = 'disabled',
}
export enum ToneMapping {
  HABLE = 'hable',
  MOBIUS = 'mobius',
  REINHARD = 'reinhard',
  DISABLED = 'disabled',
}
export enum CQMode {
  AUTO = 'auto',
  CQP = 'cqp',
  ICQ = 'icq',
}
export enum Colorspace {
  SRGB = 'srgb',
  P3 = 'p3',
}
export enum ImageFormat {
  JPEG = 'jpeg',
  WEBP = 'webp',
}
export enum RawExtractedFormat {
  JPEG = 'jpeg',
  JXL = 'jxl',
}
export enum LogLevel {
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}
export enum MetadataKey {
  AUTH_ROUTE = 'auth_route',
  ADMIN_ROUTE = 'admin_route',
  SHARED_ROUTE = 'shared_route',
  API_KEY_SECURITY = 'api_key',
  EVENT_CONFIG = 'event_config',
  JOB_CONFIG = 'job_config',
  TELEMETRY_ENABLED = 'telemetry_enabled',
}
export enum RouteKey {
  ASSET = 'assets',
  USER = 'users',
}
export enum CacheControl {
  PRIVATE_WITH_CACHE = 'private_with_cache',
  PRIVATE_WITHOUT_CACHE = 'private_without_cache',
  NONE = 'none',
}
export enum PaginationMode {
  LIMIT_OFFSET = 'limit-offset',
  SKIP_TAKE = 'skip-take',
}
export enum ImmichEnvironment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production',
}
export enum ImmichWorker {
  API = 'api',
  MICROSERVICES = 'microservices',
}
export enum ImmichTelemetry {
  HOST = 'host',
  API = 'api',
  IO = 'io',
  REPO = 'repo',
  JOB = 'job',
}
export enum ExifOrientation {
  Horizontal = 1,
  MirrorHorizontal = 2,
  Rotate180 = 3,
  MirrorVertical = 4,
  MirrorHorizontalRotate270CW = 5,
  Rotate90CW = 6,
  MirrorHorizontalRotate90CW = 7,
  Rotate270CW = 8,
}
export enum DatabaseExtension {
  CUBE = 'cube',
  EARTH_DISTANCE = 'earthdistance',
  VECTOR = 'vector',
  VECTORS = 'vectors',
  VECTORCHORD = 'vchord',
}
export enum BootstrapEventPriority {
  // Database service should be initialized before anything else, most other services need database access
  DatabaseService = -200,
  // Other services may need to queue jobs on bootstrap.
  JobService = -190,
  // Initialise config after other bootstrap services, stop other services from using config on bootstrap
  SystemConfig = 100,
}
export enum QueueName {
  THUMBNAIL_GENERATION = 'thumbnailGeneration',
  METADATA_EXTRACTION = 'metadataExtraction',
  VIDEO_CONVERSION = 'videoConversion',
  FACE_DETECTION = 'faceDetection',
  FACIAL_RECOGNITION = 'facialRecognition',
  SMART_SEARCH = 'smartSearch',
  DUPLICATE_DETECTION = 'duplicateDetection',
  BACKGROUND_TASK = 'backgroundTask',
  STORAGE_TEMPLATE_MIGRATION = 'storageTemplateMigration',
  MIGRATION = 'migration',
  SEARCH = 'search',
  SIDECAR = 'sidecar',
  LIBRARY = 'library',
  NOTIFICATION = 'notifications',
  BACKUP_DATABASE = 'backupDatabase',
}
export enum JobName {
  //backups
  BACKUP_DATABASE = 'database-backup',
  // conversion
  QUEUE_VIDEO_CONVERSION = 'queue-video-conversion',
  VIDEO_CONVERSION = 'video-conversion',
  // thumbnails
  QUEUE_GENERATE_THUMBNAILS = 'queue-generate-thumbnails',
  GENERATE_THUMBNAILS = 'generate-thumbnails',
  GENERATE_PERSON_THUMBNAIL = 'generate-person-thumbnail',
  // metadata
  QUEUE_METADATA_EXTRACTION = 'queue-metadata-extraction',
  METADATA_EXTRACTION = 'metadata-extraction',
  // user
  USER_DELETION = 'user-deletion',
  USER_DELETE_CHECK = 'user-delete-check',
  USER_SYNC_USAGE = 'user-sync-usage',
  // asset
  ASSET_DELETION = 'asset-deletion',
  ASSET_DELETION_CHECK = 'asset-deletion-check',
  // storage template
  STORAGE_TEMPLATE_MIGRATION = 'storage-template-migration',
  STORAGE_TEMPLATE_MIGRATION_SINGLE = 'storage-template-migration-single',
  // tags
  TAG_CLEANUP = 'tag-cleanup',
  // migration
  QUEUE_MIGRATION = 'queue-migration',
  MIGRATE_ASSET = 'migrate-asset',
  MIGRATE_PERSON = 'migrate-person',
  // facial recognition
  PERSON_CLEANUP = 'person-cleanup',
  QUEUE_FACE_DETECTION = 'queue-face-detection',
  FACE_DETECTION = 'face-detection',
  QUEUE_FACIAL_RECOGNITION = 'queue-facial-recognition',
  FACIAL_RECOGNITION = 'facial-recognition',
  // library management
  LIBRARY_QUEUE_SYNC_FILES = 'library-queue-sync-files',
  LIBRARY_QUEUE_SYNC_ASSETS = 'library-queue-sync-assets',
  LIBRARY_SYNC_FILES = 'library-sync-files',
  LIBRARY_SYNC_ASSETS = 'library-sync-assets',
  LIBRARY_ASSET_REMOVAL = 'handle-library-file-deletion',
  LIBRARY_DELETE = 'library-delete',
  LIBRARY_QUEUE_SCAN_ALL = 'library-queue-scan-all',
  LIBRARY_QUEUE_CLEANUP = 'library-queue-cleanup',
  // cleanup
  DELETE_FILES = 'delete-files',
  CLEAN_OLD_AUDIT_LOGS = 'clean-old-audit-logs',
  CLEAN_OLD_SESSION_TOKENS = 'clean-old-session-tokens',
  // memories
  MEMORIES_CLEANUP = 'memories-cleanup',
  MEMORIES_CREATE = 'memories-create',
  // smart search
  QUEUE_SMART_SEARCH = 'queue-smart-search',
  SMART_SEARCH = 'smart-search',
  QUEUE_TRASH_EMPTY = 'queue-trash-empty',
  // duplicate detection
  QUEUE_DUPLICATE_DETECTION = 'queue-duplicate-detection',
  DUPLICATE_DETECTION = 'duplicate-detection',
  // XMP sidecars
  QUEUE_SIDECAR = 'queue-sidecar',
  SIDECAR_DISCOVERY = 'sidecar-discovery',
  SIDECAR_SYNC = 'sidecar-sync',
  SIDECAR_WRITE = 'sidecar-write',
  // Notification
  NOTIFY_SIGNUP = 'notify-signup',
  NOTIFY_ALBUM_INVITE = 'notify-album-invite',
  NOTIFY_ALBUM_UPDATE = 'notify-album-update',
  NOTIFICATIONS_CLEANUP = 'notifications-cleanup',
  SEND_EMAIL = 'notification-send-email',
  // Version check
  VERSION_CHECK = 'version-check',
}
export enum JobCommand {
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  EMPTY = 'empty',
  CLEAR_FAILED = 'clear-failed',
}
export enum JobStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
export enum QueueCleanType {
  FAILED = 'failed',
}
export enum VectorIndex {
  CLIP = 'clip_index',
  FACE = 'face_index',
}
export enum DatabaseLock {
  GeodataImport = 100,
  Migrations = 200,
  SystemFileMounts = 300,
  StorageTemplateMigration = 420,
  VersionHistory = 500,
  CLIPDimSize = 512,
  Library = 1337,
  GetSystemConfig = 69,
  BackupDatabase = 42,
  MemoryCreation = 777,
}
export enum SyncRequestType {
  AlbumsV1 = 'AlbumsV1',
  AlbumUsersV1 = 'AlbumUsersV1',
  AlbumToAssetsV1 = 'AlbumToAssetsV1',
  AlbumAssetsV1 = 'AlbumAssetsV1',
  AlbumAssetExifsV1 = 'AlbumAssetExifsV1',
  AssetsV1 = 'AssetsV1',
  AssetExifsV1 = 'AssetExifsV1',
  MemoriesV1 = 'MemoriesV1',
  MemoryToAssetsV1 = 'MemoryToAssetsV1',
  PartnersV1 = 'PartnersV1',
  PartnerAssetsV1 = 'PartnerAssetsV1',
  PartnerAssetExifsV1 = 'PartnerAssetExifsV1',
  PartnerStacksV1 = 'PartnerStacksV1',
  StacksV1 = 'StacksV1',
  UsersV1 = 'UsersV1',
}
export enum SyncEntityType {
  UserV1 = 'UserV1',
  UserDeleteV1 = 'UserDeleteV1',
  AssetV1 = 'AssetV1',
  AssetDeleteV1 = 'AssetDeleteV1',
  AssetExifV1 = 'AssetExifV1',
  PartnerV1 = 'PartnerV1',
  PartnerDeleteV1 = 'PartnerDeleteV1',
  PartnerAssetV1 = 'PartnerAssetV1',
  PartnerAssetBackfillV1 = 'PartnerAssetBackfillV1',
  PartnerAssetDeleteV1 = 'PartnerAssetDeleteV1',
  PartnerAssetExifV1 = 'PartnerAssetExifV1',
  PartnerAssetExifBackfillV1 = 'PartnerAssetExifBackfillV1',
  PartnerStackBackfillV1 = 'PartnerStackBackfillV1',
  PartnerStackDeleteV1 = 'PartnerStackDeleteV1',
  PartnerStackV1 = 'PartnerStackV1',
  AlbumV1 = 'AlbumV1',
  AlbumDeleteV1 = 'AlbumDeleteV1',
  AlbumUserV1 = 'AlbumUserV1',
  AlbumUserBackfillV1 = 'AlbumUserBackfillV1',
  AlbumUserDeleteV1 = 'AlbumUserDeleteV1',
  AlbumAssetV1 = 'AlbumAssetV1',
  AlbumAssetBackfillV1 = 'AlbumAssetBackfillV1',
  AlbumAssetExifV1 = 'AlbumAssetExifV1',
  AlbumAssetExifBackfillV1 = 'AlbumAssetExifBackfillV1',
  AlbumToAssetV1 = 'AlbumToAssetV1',
  AlbumToAssetDeleteV1 = 'AlbumToAssetDeleteV1',
  AlbumToAssetBackfillV1 = 'AlbumToAssetBackfillV1',
  MemoryV1 = 'MemoryV1',
  MemoryDeleteV1 = 'MemoryDeleteV1',
  MemoryToAssetV1 = 'MemoryToAssetV1',
  MemoryToAssetDeleteV1 = 'MemoryToAssetDeleteV1',
  StackV1 = 'StackV1',
  StackDeleteV1 = 'StackDeleteV1',
  SyncAckV1 = 'SyncAckV1',
}
export enum NotificationLevel {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}
export enum NotificationType {
  JobFailed = 'JobFailed',
  BackupFailed = 'BackupFailed',
  SystemMessage = 'SystemMessage',
  Custom = 'Custom',
}
export enum OAuthTokenEndpointAuthMethod {
  CLIENT_SECRET_POST = 'client_secret_post',
  CLIENT_SECRET_BASIC = 'client_secret_basic',
}
export enum DatabaseSslMode {
  Disable = 'disable',
  Allow = 'allow',
  Prefer = 'prefer',
  Require = 'require',
  VerifyFull = 'verify-full',
}
export enum AssetVisibility {
  ARCHIVE = 'archive',
  TIMELINE = 'timeline',
  /**
   * Video part of the LivePhotos and MotionPhotos
   */
  HIDDEN = 'hidden',
  LOCKED = 'locked',
}
```

## File: server/src/main.ts
```typescript
import { CommandFactory } from 'nest-commander';
import { ChildProcess, fork } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { ImmichAdminModule } from 'src/app.module';
import { ImmichWorker, LogLevel } from 'src/enum';
import { ConfigRepository } from 'src/repositories/config.repository';
const immichApp = process.argv[2];
if (immichApp) {
  process.argv.splice(2, 1);
}
let apiProcess: ChildProcess | undefined;
const onError = (name: string, error: Error) => {
  console.error(`${name} worker error: ${error}, stack: ${error.stack}`);
};
const onExit = (name: string, exitCode: number | null) => {
  if (exitCode !== 0) {
    console.error(`${name} worker exited with code ${exitCode}`);
    if (apiProcess && name !== ImmichWorker.API) {
      console.error('Killing api process');
      apiProcess.kill('SIGTERM');
      apiProcess = undefined;
    }
  }
  process.exit(exitCode);
};
function bootstrapWorker(name: ImmichWorker) {
  console.log(`Starting ${name} worker`);
  let worker: Worker | ChildProcess;
  if (name === ImmichWorker.API) {
    worker = fork(`./dist/workers/${name}.js`, [], {
      execArgv: process.execArgv.map((arg) => (arg.startsWith('--inspect') ? '--inspect=0.0.0.0:9231' : arg)),
    });
    apiProcess = worker;
  } else {
    worker = new Worker(`./dist/workers/${name}.js`);
  }
  worker.on('error', (error) => onError(name, error));
  worker.on('exit', (exitCode) => onExit(name, exitCode));
}
function bootstrap() {
  if (immichApp === 'immich-admin') {
    process.title = 'immich_admin_cli';
    process.env.IMMICH_LOG_LEVEL = LogLevel.WARN;
    return CommandFactory.run(ImmichAdminModule);
  }
  if (immichApp === 'immich' || immichApp === 'microservices') {
    console.error(
      `Using "start.sh ${immichApp}" has been deprecated. See https://github.com/immich-app/immich/releases/tag/v1.118.0 for more information.`,
    );
    process.exit(1);
  }
  if (immichApp) {
    console.error(`Unknown command: "${immichApp}"`);
    process.exit(1);
  }
  process.title = 'immich';
  const { workers } = new ConfigRepository().getEnv();
  for (const worker of workers) {
    bootstrapWorker(worker);
  }
}
void bootstrap();
```

## File: server/src/types.ts
```typescript
import { SystemConfig } from 'src/config';
import { VECTOR_EXTENSIONS } from 'src/constants';
import {
  AssetOrder,
  AssetType,
  DatabaseSslMode,
  ExifOrientation,
  ImageFormat,
  JobName,
  MemoryType,
  QueueName,
  StorageFolder,
  SyncEntityType,
  SystemMetadataKey,
  TranscodeTarget,
  UserMetadataKey,
  VideoCodec,
} from 'src/enum';
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type RepositoryInterface<T extends object> = Pick<T, keyof T>;
export interface CropOptions {
  top: number;
  left: number;
  width: number;
  height: number;
}
export interface FullsizeImageOptions {
  format: ImageFormat;
  quality: number;
  enabled: boolean;
}
export interface ImageOptions {
  format: ImageFormat;
  quality: number;
  size: number;
}
export interface RawImageInfo {
  width: number;
  height: number;
  channels: 1 | 2 | 3 | 4;
}
interface DecodeImageOptions {
  colorspace: string;
  crop?: CropOptions;
  processInvalidImages: boolean;
  raw?: RawImageInfo;
}
export interface DecodeToBufferOptions extends DecodeImageOptions {
  size?: number;
  orientation?: ExifOrientation;
}
export type GenerateThumbnailOptions = Pick<ImageOptions, 'format' | 'quality'> & DecodeToBufferOptions;
export type GenerateThumbnailFromBufferOptions = GenerateThumbnailOptions & { raw: RawImageInfo };
export type GenerateThumbhashOptions = DecodeImageOptions;
export type GenerateThumbhashFromBufferOptions = GenerateThumbhashOptions & { raw: RawImageInfo };
export interface GenerateThumbnailsOptions {
  colorspace: string;
  crop?: CropOptions;
  preview?: ImageOptions;
  processInvalidImages: boolean;
  thumbhash?: boolean;
  thumbnail?: ImageOptions;
}
export interface VideoStreamInfo {
  index: number;
  height: number;
  width: number;
  rotation: number;
  codecName?: string;
  frameCount: number;
  isHDR: boolean;
  bitrate: number;
  pixelFormat: string;
}
export interface AudioStreamInfo {
  index: number;
  codecName?: string;
  bitrate: number;
}
export interface VideoFormat {
  formatName?: string;
  formatLongName?: string;
  duration: number;
  bitrate: number;
}
export interface ImageDimensions {
  width: number;
  height: number;
}
export interface InputDimensions extends ImageDimensions {
  inputPath: string;
}
export interface VideoInfo {
  format: VideoFormat;
  videoStreams: VideoStreamInfo[];
  audioStreams: AudioStreamInfo[];
}
export interface TranscodeCommand {
  inputOptions: string[];
  outputOptions: string[];
  twoPass: boolean;
  progress: {
    frameCount: number;
    percentInterval: number;
  };
}
export interface BitrateDistribution {
  max: number;
  target: number;
  min: number;
  unit: string;
}
export interface ImageBuffer {
  data: Buffer;
  info: RawImageInfo;
}
export interface VideoCodecSWConfig {
  getCommand(
    target: TranscodeTarget,
    videoStream: VideoStreamInfo,
    audioStream: AudioStreamInfo,
    format?: VideoFormat,
  ): TranscodeCommand;
}
export interface VideoCodecHWConfig extends VideoCodecSWConfig {
  getSupportedCodecs(): Array<VideoCodec>;
}
export interface ProbeOptions {
  countFrames: boolean;
}
export interface VideoInterfaces {
  dri: string[];
  mali: boolean;
}
export type ConcurrentQueueName = Exclude<
  QueueName,
  | QueueName.STORAGE_TEMPLATE_MIGRATION
  | QueueName.FACIAL_RECOGNITION
  | QueueName.DUPLICATE_DETECTION
  | QueueName.BACKUP_DATABASE
>;
export type Jobs = { [K in JobItem['name']]: (JobItem & { name: K })['data'] };
export type JobOf<T extends JobName> = Jobs[T];
export interface IBaseJob {
  force?: boolean;
}
export interface IDelayedJob extends IBaseJob {
  /** The minimum time to wait to execute this job, in milliseconds. */
  delay?: number;
}
export type JobSource = 'upload' | 'sidecar-write' | 'copy';
export interface IEntityJob extends IBaseJob {
  id: string;
  source?: JobSource;
  notify?: boolean;
}
export interface IAssetDeleteJob extends IEntityJob {
  deleteOnDisk: boolean;
}
export interface ILibraryFileJob {
  libraryId: string;
  paths: string[];
  progressCounter?: number;
  totalAssets?: number;
}
export interface ILibraryBulkIdsJob {
  libraryId: string;
  importPaths: string[];
  exclusionPatterns: string[];
  assetIds: string[];
  progressCounter: number;
  totalAssets: number;
}
export interface IBulkEntityJob {
  ids: string[];
}
export interface IDeleteFilesJob extends IBaseJob {
  files: Array<string | null | undefined>;
}
export interface ISidecarWriteJob extends IEntityJob {
  description?: string;
  dateTimeOriginal?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  tags?: true;
}
export interface IDeferrableJob extends IEntityJob {
  deferred?: boolean;
}
export interface INightlyJob extends IBaseJob {
  nightly?: boolean;
}
export type EmailImageAttachment = {
  filename: string;
  path: string;
  cid: string;
};
export interface IEmailJob {
  to: string;
  subject: string;
  html: string;
  text: string;
  imageAttachments?: EmailImageAttachment[];
}
export interface INotifySignupJob extends IEntityJob {
  tempPassword?: string;
}
export interface INotifyAlbumInviteJob extends IEntityJob {
  recipientId: string;
}
export interface INotifyAlbumUpdateJob extends IEntityJob, IDelayedJob {
  recipientId: string;
}
export interface JobCounts {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
  paused: number;
}
export interface QueueStatus {
  isActive: boolean;
  isPaused: boolean;
}
export type JobItem =
  // Backups
  | { name: JobName.BACKUP_DATABASE; data?: IBaseJob }
  // Transcoding
  | { name: JobName.QUEUE_VIDEO_CONVERSION; data: IBaseJob }
  | { name: JobName.VIDEO_CONVERSION; data: IEntityJob }
  // Thumbnails
  | { name: JobName.QUEUE_GENERATE_THUMBNAILS; data: IBaseJob }
  | { name: JobName.GENERATE_THUMBNAILS; data: IEntityJob }
  // User
  | { name: JobName.USER_DELETE_CHECK; data?: IBaseJob }
  | { name: JobName.USER_DELETION; data: IEntityJob }
  | { name: JobName.USER_SYNC_USAGE; data?: IBaseJob }
  // Storage Template
  | { name: JobName.STORAGE_TEMPLATE_MIGRATION; data?: IBaseJob }
  | { name: JobName.STORAGE_TEMPLATE_MIGRATION_SINGLE; data: IEntityJob }
  // Migration
  | { name: JobName.QUEUE_MIGRATION; data?: IBaseJob }
  | { name: JobName.MIGRATE_ASSET; data: IEntityJob }
  | { name: JobName.MIGRATE_PERSON; data: IEntityJob }
  // Metadata Extraction
  | { name: JobName.QUEUE_METADATA_EXTRACTION; data: IBaseJob }
  | { name: JobName.METADATA_EXTRACTION; data: IEntityJob }
  // Notifications
  | { name: JobName.NOTIFICATIONS_CLEANUP; data?: IBaseJob }
  // Sidecar Scanning
  | { name: JobName.QUEUE_SIDECAR; data: IBaseJob }
  | { name: JobName.SIDECAR_DISCOVERY; data: IEntityJob }
  | { name: JobName.SIDECAR_SYNC; data: IEntityJob }
  | { name: JobName.SIDECAR_WRITE; data: ISidecarWriteJob }
  // Facial Recognition
  | { name: JobName.QUEUE_FACE_DETECTION; data: IBaseJob }
  | { name: JobName.FACE_DETECTION; data: IEntityJob }
  | { name: JobName.QUEUE_FACIAL_RECOGNITION; data: INightlyJob }
  | { name: JobName.FACIAL_RECOGNITION; data: IDeferrableJob }
  | { name: JobName.GENERATE_PERSON_THUMBNAIL; data: IEntityJob }
  // Smart Search
  | { name: JobName.QUEUE_SMART_SEARCH; data: IBaseJob }
  | { name: JobName.SMART_SEARCH; data: IEntityJob }
  | { name: JobName.QUEUE_TRASH_EMPTY; data?: IBaseJob }
  // Duplicate Detection
  | { name: JobName.QUEUE_DUPLICATE_DETECTION; data: IBaseJob }
  | { name: JobName.DUPLICATE_DETECTION; data: IEntityJob }
  // Memories
  | { name: JobName.MEMORIES_CLEANUP; data?: IBaseJob }
  | { name: JobName.MEMORIES_CREATE; data?: IBaseJob }
  // Filesystem
  | { name: JobName.DELETE_FILES; data: IDeleteFilesJob }
  // Cleanup
  | { name: JobName.CLEAN_OLD_AUDIT_LOGS; data?: IBaseJob }
  | { name: JobName.CLEAN_OLD_SESSION_TOKENS; data?: IBaseJob }
  // Tags
  | { name: JobName.TAG_CLEANUP; data?: IBaseJob }
  // Asset Deletion
  | { name: JobName.PERSON_CLEANUP; data?: IBaseJob }
  | { name: JobName.ASSET_DELETION; data: IAssetDeleteJob }
  | { name: JobName.ASSET_DELETION_CHECK; data?: IBaseJob }
  // Library Management
  | { name: JobName.LIBRARY_SYNC_FILES; data: ILibraryFileJob }
  | { name: JobName.LIBRARY_QUEUE_SYNC_FILES; data: IEntityJob }
  | { name: JobName.LIBRARY_QUEUE_SYNC_ASSETS; data: IEntityJob }
  | { name: JobName.LIBRARY_SYNC_ASSETS; data: ILibraryBulkIdsJob }
  | { name: JobName.LIBRARY_ASSET_REMOVAL; data: ILibraryFileJob }
  | { name: JobName.LIBRARY_DELETE; data: IEntityJob }
  | { name: JobName.LIBRARY_QUEUE_SCAN_ALL; data?: IBaseJob }
  | { name: JobName.LIBRARY_QUEUE_CLEANUP; data: IBaseJob }
  // Notification
  | { name: JobName.SEND_EMAIL; data: IEmailJob }
  | { name: JobName.NOTIFY_ALBUM_INVITE; data: INotifyAlbumInviteJob }
  | { name: JobName.NOTIFY_ALBUM_UPDATE; data: INotifyAlbumUpdateJob }
  | { name: JobName.NOTIFY_SIGNUP; data: INotifySignupJob }
  // Version check
  | { name: JobName.VERSION_CHECK; data: IBaseJob };
export type VectorExtension = (typeof VECTOR_EXTENSIONS)[number];
export type DatabaseConnectionURL = {
  connectionType: 'url';
  url: string;
};
export type DatabaseConnectionParts = {
  connectionType: 'parts';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: DatabaseSslMode;
};
export type DatabaseConnectionParams = DatabaseConnectionURL | DatabaseConnectionParts;
export interface ExtensionVersion {
  name: VectorExtension;
  availableVersion: string | null;
  installedVersion: string | null;
}
export interface VectorUpdateResult {
  restartRequired: boolean;
}
export interface ImmichFile extends Express.Multer.File {
  /** sha1 hash of file */
  uuid: string;
  checksum: Buffer;
}
export interface UploadFile {
  uuid: string;
  checksum: Buffer;
  originalPath: string;
  originalName: string;
  size: number;
}
export interface UploadFiles {
  assetData: ImmichFile[];
  sidecarData: ImmichFile[];
}
export interface IBulkAsset {
  getAssetIds: (id: string, assetIds: string[]) => Promise<Set<string>>;
  addAssetIds: (id: string, assetIds: string[]) => Promise<void>;
  removeAssetIds: (id: string, assetIds: string[]) => Promise<void>;
}
export type SyncAck = {
  type: SyncEntityType;
  updateId: string;
  extraId?: string;
};
export type StorageAsset = {
  id: string;
  ownerId: string;
  livePhotoVideoId: string | null;
  type: AssetType;
  isExternal: boolean;
  checksum: Buffer;
  timeZone: string | null;
  fileCreatedAt: Date;
  originalPath: string;
  originalFileName: string;
  sidecarPath: string | null;
  fileSizeInByte: number | null;
};
export type OnThisDayData = { year: number };
export interface MemoryData {
  [MemoryType.ON_THIS_DAY]: OnThisDayData;
}
export type VersionCheckMetadata = { checkedAt: string; releaseVersion: string };
export type SystemFlags = { mountChecks: Record<StorageFolder, boolean> };
export type MemoriesState = {
  /** memories have already been created through this date */
  lastOnThisDayDate: string;
};
export interface SystemMetadata extends Record<SystemMetadataKey, Record<string, any>> {
  [SystemMetadataKey.ADMIN_ONBOARDING]: { isOnboarded: boolean };
  [SystemMetadataKey.FACIAL_RECOGNITION_STATE]: { lastRun?: string };
  [SystemMetadataKey.LICENSE]: { licenseKey: string; activationKey: string; activatedAt: Date };
  [SystemMetadataKey.REVERSE_GEOCODING_STATE]: { lastUpdate?: string; lastImportFileName?: string };
  [SystemMetadataKey.SYSTEM_CONFIG]: DeepPartial<SystemConfig>;
  [SystemMetadataKey.SYSTEM_FLAGS]: DeepPartial<SystemFlags>;
  [SystemMetadataKey.VERSION_CHECK_STATE]: VersionCheckMetadata;
  [SystemMetadataKey.MEMORIES_STATE]: MemoriesState;
}
export type UserMetadataItem<T extends keyof UserMetadata = UserMetadataKey> = {
  key: T;
  value: UserMetadata[T];
};
export interface UserPreferences {
  albums: {
    defaultAssetOrder: AssetOrder;
  };
  folders: {
    enabled: boolean;
    sidebarWeb: boolean;
  };
  memories: {
    enabled: boolean;
  };
  people: {
    enabled: boolean;
    sidebarWeb: boolean;
  };
  ratings: {
    enabled: boolean;
  };
  sharedLinks: {
    enabled: boolean;
    sidebarWeb: boolean;
  };
  tags: {
    enabled: boolean;
    sidebarWeb: boolean;
  };
  emailNotifications: {
    enabled: boolean;
    albumInvite: boolean;
    albumUpdate: boolean;
  };
  download: {
    archiveSize: number;
    includeEmbeddedVideos: boolean;
  };
  purchase: {
    showSupportBadge: boolean;
    hideBuyButtonUntil: string;
  };
  cast: {
    gCastEnabled: boolean;
  };
}
export interface UserMetadata extends Record<UserMetadataKey, Record<string, any>> {
  [UserMetadataKey.PREFERENCES]: DeepPartial<UserPreferences>;
  [UserMetadataKey.LICENSE]: { licenseKey: string; activationKey: string; activatedAt: string };
  [UserMetadataKey.ONBOARDING]: { isOnboarded: boolean };
}
```

## File: server/src/validation.spec.ts
```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DateTime } from 'luxon';
import { IsDateStringFormat, MaxDateString } from 'src/validation';
describe('Validation', () => {
  describe('MaxDateString', () => {
    const maxDate = DateTime.fromISO('2000-01-01', { zone: 'utc' });
    class MyDto {
      @MaxDateString(maxDate)
      date!: string;
    }
    it('passes when date is before maxDate', async () => {
      const dto = plainToInstance(MyDto, { date: '1999-12-31' });
      await expect(validate(dto)).resolves.toHaveLength(0);
    });
    it('passes when date is equal to maxDate', async () => {
      const dto = plainToInstance(MyDto, { date: '2000-01-01' });
      await expect(validate(dto)).resolves.toHaveLength(0);
    });
    it('fails when date is after maxDate', async () => {
      const dto = plainToInstance(MyDto, { date: '2010-01-01' });
      await expect(validate(dto)).resolves.toHaveLength(1);
    });
  });
  describe('IsDateStringFormat', () => {
    class MyDto {
      @IsDateStringFormat('yyyy-MM-dd')
      date!: string;
    }
    it('passes when date is valid', async () => {
      const dto = plainToInstance(MyDto, { date: '1999-12-31' });
      await expect(validate(dto)).resolves.toHaveLength(0);
    });
    it('fails when date has invalid format', async () => {
      const dto = plainToInstance(MyDto, { date: '2000-01-01T00:00:00Z' });
      await expect(validate(dto)).resolves.toHaveLength(1);
    });
    it('fails when empty string', async () => {
      const dto = plainToInstance(MyDto, { date: '' });
      await expect(validate(dto)).resolves.toHaveLength(1);
    });
    it('fails when undefined', async () => {
      const dto = plainToInstance(MyDto, {});
      await expect(validate(dto)).resolves.toHaveLength(1);
    });
  });
});
```

## File: server/src/validation.ts
```typescript
import {
  ArgumentMetadata,
  BadRequestException,
  FileValidator,
  Injectable,
  ParseUUIDPipe,
  applyDecorators,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Validate,
  ValidateBy,
  ValidateIf,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  buildMessage,
  isDateString,
} from 'class-validator';
import { CronJob } from 'cron';
import { DateTime } from 'luxon';
import sanitize from 'sanitize-filename';
import { AssetVisibility } from 'src/enum';
import { isIP, isIPRange } from 'validator';
@Injectable()
export class ParseMeUUIDPipe extends ParseUUIDPipe {
  async transform(value: string, metadata: ArgumentMetadata) {
    if (value == 'me') {
      return value;
    }
    return super.transform(value, metadata);
  }
}
@Injectable()
export class FileNotEmptyValidator extends FileValidator {
  constructor(private requiredFields: string[]) {
    super({});
    this.requiredFields = requiredFields;
  }
  isValid(files?: any): boolean {
    if (!files) {
      return false;
    }
    return this.requiredFields.every((field) => files[field]);
  }
  buildErrorMessage(): string {
    return `Field(s) ${this.requiredFields.join(', ')} should not be empty`;
  }
}
export class UUIDParamDto {
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty({ format: 'uuid' })
  id!: string;
}
type PinCodeOptions = { optional?: boolean } & OptionalOptions;
export const PinCode = (options?: PinCodeOptions & ApiPropertyOptions) => {
  const { optional, nullable, emptyToNull, ...apiPropertyOptions } = {
    optional: false,
    nullable: false,
    emptyToNull: false,
    ...options,
  };
  const decorators = [
    IsString(),
    IsNotEmpty(),
    Matches(/^\d{6}$/, { message: ({ property }) => `${property} must be a 6-digit numeric string` }),
    ApiProperty({ example: '123456', ...apiPropertyOptions }),
  ];
  if (optional) {
    decorators.push(Optional({ nullable, emptyToNull }));
  }
  return applyDecorators(...decorators);
};
export interface OptionalOptions {
  nullable?: boolean;
  /** convert empty strings to null */
  emptyToNull?: boolean;
}
/**
 * Checks if value is missing and if so, ignores all validators.
 *
 * @param validationOptions {@link OptionalOptions}
 *
 * @see IsOptional exported from `class-validator.
 */
// https://stackoverflow.com/a/71353929
export function Optional({ nullable, emptyToNull, ...validationOptions }: OptionalOptions = {}) {
  const decorators: PropertyDecorator[] = [];
  if (nullable === true) {
    decorators.push(IsOptional(validationOptions));
  } else {
    decorators.push(ValidateIf((object: any, v: any) => v !== undefined, validationOptions));
  }
  if (emptyToNull) {
    decorators.push(Transform(({ value }) => (value === '' ? null : value)));
  }
  return applyDecorators(...decorators);
}
export const ValidateHexColor = () => {
  const decorators = [
    IsHexColor(),
    Transform(({ value }) => (typeof value === 'string' && value[0] !== '#' ? `#${value}` : value)),
  ];
  return applyDecorators(...decorators);
};
type UUIDOptions = { optional?: boolean; each?: boolean; nullable?: boolean };
export const ValidateUUID = (options?: UUIDOptions & ApiPropertyOptions) => {
  const { optional, each, nullable, ...apiPropertyOptions } = {
    optional: false,
    each: false,
    nullable: false,
    ...options,
  };
  return applyDecorators(
    IsUUID('4', { each }),
    ApiProperty({ format: 'uuid', ...apiPropertyOptions }),
    optional ? Optional({ nullable }) : IsNotEmpty(),
    each ? IsArray() : IsString(),
  );
};
type DateOptions = { optional?: boolean; nullable?: boolean; format?: 'date' | 'date-time' };
export const ValidateDate = (options?: DateOptions & ApiPropertyOptions) => {
  const { optional, nullable, format, ...apiPropertyOptions } = {
    optional: false,
    nullable: false,
    format: 'date-time',
    ...options,
  };
  const decorators = [
    ApiProperty({ format, ...apiPropertyOptions }),
    IsDate(),
    optional ? Optional({ nullable: true }) : IsNotEmpty(),
    Transform(({ key, value }) => {
      if (value === null || value === undefined) {
        return value;
      }
      if (!isDateString(value)) {
        throw new BadRequestException(`${key} must be a date string`);
      }
      return new Date(value as string);
    }),
  ];
  if (optional) {
    decorators.push(Optional({ nullable }));
  }
  return applyDecorators(...decorators);
};
type AssetVisibilityOptions = { optional?: boolean };
export const ValidateAssetVisibility = (options?: AssetVisibilityOptions & ApiPropertyOptions) => {
  const { optional, ...apiPropertyOptions } = { optional: false, ...options };
  const decorators = [
    IsEnum(AssetVisibility),
    ApiProperty({ enumName: 'AssetVisibility', enum: AssetVisibility, ...apiPropertyOptions }),
  ];
  if (optional) {
    decorators.push(Optional());
  }
  return applyDecorators(...decorators);
};
type BooleanOptions = { optional?: boolean };
export const ValidateBoolean = (options?: BooleanOptions & ApiPropertyOptions) => {
  const { optional, ...apiPropertyOptions } = { optional: false, ...options };
  const decorators = [
    ApiProperty(apiPropertyOptions),
    IsBoolean(),
    Transform(({ value }) => {
      if (value == 'true') {
        return true;
      } else if (value == 'false') {
        return false;
      }
      return value;
    }),
  ];
  if (optional) {
    decorators.push(Optional());
  }
  return applyDecorators(...decorators);
};
@ValidatorConstraint({ name: 'cronValidator' })
class CronValidator implements ValidatorConstraintInterface {
  validate(expression: string): boolean {
    try {
      new CronJob(expression, () => {});
      return true;
    } catch {
      return false;
    }
  }
}
export const IsCronExpression = () => Validate(CronValidator, { message: 'Invalid cron expression' });
type IValue = { value: unknown };
export const toEmail = ({ value }: IValue) => (typeof value === 'string' ? value.toLowerCase() : value);
export const toSanitized = ({ value }: IValue) => {
  const input = typeof value === 'string' ? value : '';
  return sanitize(input.replaceAll('.', ''));
};
export const isValidInteger = (value: number, options: { min?: number; max?: number }): value is number => {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options;
  return Number.isInteger(value) && value >= min && value <= max;
};
export function isDateStringFormat(value: unknown, format: string) {
  if (typeof value !== 'string') {
    return false;
  }
  return DateTime.fromFormat(value, format, { zone: 'utc' }).isValid;
}
export function IsDateStringFormat(format: string, validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isDateStringFormat',
      constraints: [format],
      validator: {
        validate(value: unknown) {
          return isDateStringFormat(value, format);
        },
        defaultMessage: () => `$property must be a string in the format ${format}`,
      },
    },
    validationOptions,
  );
}
function maxDate(date: DateTime, maxDate: DateTime | (() => DateTime)) {
  return date <= (maxDate instanceof DateTime ? maxDate : maxDate());
}
export function MaxDateString(
  date: DateTime | (() => DateTime),
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxDateString',
      constraints: [date],
      validator: {
        validate: (value, args) => {
          const date = DateTime.fromISO(value, { zone: 'utc' });
          return maxDate(date, args?.constraints[0]);
        },
        defaultMessage: buildMessage(
          (eachPrefix) => 'maximal allowed date for ' + eachPrefix + '$property is $constraint1',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
type IsIPRangeOptions = { requireCIDR?: boolean };
export function IsIPRange(options: IsIPRangeOptions, validationOptions?: ValidationOptions): PropertyDecorator {
  const { requireCIDR } = { requireCIDR: true, ...options };
  return ValidateBy(
    {
      name: 'isIPRange',
      validator: {
        validate: (value): boolean => {
          if (isIPRange(value)) {
            return true;
          }
          if (!requireCIDR && isIP(value)) {
            return true;
          }
          return false;
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be an ip address, or ip address range',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
```
