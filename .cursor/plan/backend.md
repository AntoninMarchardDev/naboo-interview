# Backend Refactoring Plan

---

## P0 — Critical (Security / Breaking)

These must be done before any deployment. They are security vulnerabilities or runtime breakages.

---

### P0-1 · Remove `password` from GraphQL schema

**File:** `src/user/user.schema.ts`

`password` is decorated with `@Field()`, which means the bcrypt hash is part of the generated schema and is returned by `register`, `getMe`, and every `Activity.owner` resolution.

**Fix:** Remove `@Field()` from `password`. The field stays in the Mongoose document (needed for auth) but disappears from GraphQL. `schema.gql` will regenerate cleanly on next build.

```typescript
// src/user/user.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
@Schema({ timestamps: true })
export class User extends Document {
  @Field(() => ID)
  id!: string;

  @Prop({ required: true, enum: ["user", "admin"], default: "user" })
  role!: "user" | "admin";

  @Field()
  @Prop({ required: true })
  firstName!: string;

  @Field()
  @Prop({ required: true })
  lastName!: string;

  @Field()
  @Prop({ required: true, unique: true })
  email!: string;

  // No @Field() — never exposed via GraphQL
  @Prop({ required: true })
  password!: string;

  @Prop()
  token?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

---

### P0-2 · Invalid JWT must not block public queries

**File:** `src/app.module.ts`

When a request carries a bad/expired JWT cookie, `jwtService.verifyAsync` throws and the entire GraphQL request fails — including public queries like `getActivities`. This means a user with a stale cookie is completely locked out of the app.

Additionally, the `algorithms` option should be explicitly set to prevent algorithm confusion attacks, and the internal error must not be forwarded to the client.

**Fix:** Catch the verification error, set `jwtPayload = null`, and let `AuthGuard` reject protected resolvers. Also add `algorithms: ['HS256']`.

```typescript
// src/app.module.ts — context factory inside GraphQLModule.forRootAsync
context: async ({ req, res }: { req: Request; res: Response }) => {
  const token = req.headers.jwt ?? (req.cookies && req.cookies['jwt']);

  let jwtPayload: PayloadDto | null = null;
  if (token) {
    try {
      jwtPayload = (await jwtService.verifyAsync(token, {
        secret,
        algorithms: ['HS256'],
      })) as PayloadDto;
    } catch {
      // Expired or tampered token — treat as unauthenticated.
      // AuthGuard will reject protected resolvers.
      jwtPayload = null;
    }
  }

  return { jwtPayload, req, res };
},
```

---

### P0-3 · Gate seeding behind `NODE_ENV`

**File:** `src/app.service.ts`

The seed runs on every `onApplicationBootstrap`, which creates predictable accounts (`user1`, `admin`) in any environment that starts the app — including production.

**Fix:** Only run seed outside production. Prefer an explicit `RUN_SEED` flag for staging environments that need it.

```typescript
// src/app.service.ts
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { SeedService } from "./seed/seed.service";

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private seedService: SeedService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      Logger.log("Seeding skipped in production.");
      return;
    }
    await this.seedService.execute();
  }
}
```

---

## P1 — High (Architecture / Correctness)

These are serious issues that impact correctness, security hardening, or major architectural quality.

---

### P1-1 · Fix N+1 on `Activity.owner`

**Files:** `src/activity/activity.service.ts`, `src/activity/activity.resolver.ts`

The `owner` `@ResolveField` calls `activity.populate('owner')` **per parent row**. For a list of 20 activities, that is 20 individual DB lookups after the initial find.

**Fix (pragmatic):** Populate `owner` in every service query that returns lists. The `@ResolveField` then returns the already-loaded value synchronously. This eliminates the N+1 with no extra infrastructure.

> Note: The production-grade solution for partial selections (when `owner` is not requested) is a **DataLoader**. That should be a follow-up P2 if the API grows. For now, eager population is correct and vastly better than per-row populate.

```typescript
// src/activity/activity.service.ts
async findAll(): Promise<Activity[]> {
  return this.activityModel
    .find()
    .populate('owner')
    .sort({ createdAt: -1 })
    .exec();
}

async findLatest(): Promise<Activity[]> {
  return this.activityModel
    .find()
    .populate('owner')
    .sort({ createdAt: -1 })
    .limit(3)
    .exec();
}

async findByUser(userId: string): Promise<Activity[]> {
  return this.activityModel
    .find({ owner: userId })
    .populate('owner')
    .sort({ createdAt: -1 })
    .exec();
}

async findOne(id: string): Promise<Activity> {
  const activity = await this.activityModel.findById(id).populate('owner').exec();
  if (!activity) throw new NotFoundException();
  return activity;
}

async findByCity(city: string, activity?: string, price?: number): Promise<Activity[]> {
  return this.activityModel
    .find({
      $and: [
        { city },
        ...(price ? [{ price }] : []),
        ...(activity
          ? [{ name: { $regex: escapeRegex(activity), $options: 'i' } }]
          : []),
      ],
    })
    .populate('owner')
    .exec();
}

// Add this helper at module level (or import a library like `escape-string-regexp`)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

```typescript
// src/activity/activity.resolver.ts — owner field resolver becomes synchronous
@ResolveField(() => User)
owner(@Parent() activity: Activity): User {
  // Already populated in the service — no async work needed
  return activity.owner as User;
}
```

---

### P1-2 · Fix module architecture (`SeedModule` + `UserModule`)

**Files:** `src/seed/seed.module.ts`, `src/user/user.module.ts`

`SeedModule` re-registers `MongooseModule.forFeature([User, Activity])` and directly provides `UserService` + `ActivityService`, while also importing `UserModule` and `ActivityModule` (which already export those services). This creates duplicate provider instances.

`UserModule` registers the `Activity` schema despite `UserService` never needing it.

**Fix:**

```typescript
// src/seed/seed.module.ts
import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [UserModule, ActivityModule],
  // No providers — use the services exported by the imported modules
})
export class SeedModule {}
```

```typescript
// src/user/user.module.ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.schema";
import { UserService } from "./user.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // Activity schema removed — not UserService's concern
  ],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
```

Also, `SeedService` must be moved from `BaseAppModule.providers` into `SeedModule.providers` and exported, so `AppService` can receive it:

```typescript
// src/seed/seed.module.ts (final)
import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module";
import { UserModule } from "../user/user.module";
import { SeedService } from "./seed.service";

@Module({
  imports: [UserModule, ActivityModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
```

```typescript
// src/app.module.ts — remove SeedService from BaseAppModule providers
// SeedModule now exports SeedService; AppService receives it via DI through SeedModule import
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({ ... }),
    AuthModule,
    UserModule,
    MeModule,
    ActivityModule,
    SeedModule, // SeedService is exported from here
  ],
  controllers: [AppController],
  providers: [AppService], // SeedService removed — comes from SeedModule
})
export class BaseAppModule {}
```

---

### P1-3 · Fix exception semantics in `AuthService`

**File:** `src/auth/auth.service.ts`

- Duplicate email throws `UnauthorizedException` — misleading; should be `ConflictException`.
- Wrong password throws `HttpException(..., 400)` — should be `UnauthorizedException` for consistency and correct HTTP semantics.

```typescript
// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User } from "src/user/user.schema";
import { UserService } from "../user/user.service";
import { SignInDto, SignInInput, SignUpInput } from "./types";
import { PayloadDto } from "./types/jwtPayload.dto";

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn({ email, password }: SignInInput): Promise<SignInDto> {
    const user = await this.userService.getByEmail(email);
    const isSamePassword = await bcrypt.compare(password, user.password);

    if (!isSamePassword) throw new UnauthorizedException("Invalid credentials");

    const token = await this.generateToken({ user });

    // Token is stateless — no need to persist it in the DB
    return { access_token: token };
  }

  async generateToken({ user }: { user: User }): Promise<string> {
    const payload: PayloadDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return this.jwtService.signAsync(payload);
  }

  async signUp({
    email,
    password,
    firstName,
    lastName,
  }: SignUpInput): Promise<User> {
    const existing = await this.userService.findByEmail(email);

    if (existing) throw new ConflictException("Email already in use");

    return this.userService.createUser({
      email,
      password,
      firstName,
      lastName,
    });
  }
}
```

> Note: `updateToken` call is removed. The JWT is stateless — persisting it in MongoDB adds no value and creates a leaked-token risk. The `token` field on `User` and `UserService.updateToken` can be removed in a follow-up cleanup.

---

### P1-4 · Harden cookie options and gate playground

**File:** `src/auth/auth.resolver.ts`, `src/app.module.ts`

Cookie is missing `secure`, `sameSite`, and `maxAge`. Playground is always enabled.

```typescript
// src/auth/auth.resolver.ts
import { Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { SignInDto, SignInInput, SignUpInput } from "./types";
import { AuthService } from "./auth.service";
import { User } from "src/user/user.schema";
import { GqlContext } from "src/auth/types/context";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Resolver("Auth")
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => SignInDto)
  async login(
    @Args("signInInput") loginUserDto: SignInInput,
    @Context() ctx: GqlContext,
  ): Promise<SignInDto> {
    const data = await this.authService.signIn(loginUserDto);
    ctx.res.cookie("jwt", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.FRONTEND_DOMAIN,
      maxAge: SEVEN_DAYS_MS,
    });
    return data;
  }

  @Mutation(() => User)
  async register(
    @Args("signUpInput") createUserDto: SignUpInput,
  ): Promise<User> {
    return this.authService.signUp(createUserDto);
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext): Promise<boolean> {
    ctx.res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.FRONTEND_DOMAIN,
    });
    return true;
  }
}
```

Add a proper `GqlContext` type (replaces `any`):

```typescript
// src/auth/types/context.ts
import { Request, Response } from "express";
import { PayloadDto } from "./jwtPayload.dto";

export interface GqlContext {
  req: Request;
  res: Response;
  jwtPayload: PayloadDto | null;
}

// For resolvers that require authentication (jwtPayload is guaranteed non-null)
export interface ContextWithJWTPayload extends GqlContext {
  jwtPayload: PayloadDto;
}
```

```typescript
// src/app.module.ts — disable playground + introspection in production
return {
  autoSchemaFile: 'schema.gql',
  sortSchema: true,
  playground: process.env.NODE_ENV !== 'production',
  introspection: process.env.NODE_ENV !== 'production',
  buildSchemaOptions: { numberScalarMode: 'integer' },
  context: async ({ req, res }) => { ... },
};
```

---

### P1-5 · Fix `ValidationPipe` and port configuration

**File:** `src/main.ts`

Port is hardcoded to `3000`. `ValidationPipe` runs without `whitelist`/`transform`.

```typescript
// src/main.ts
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  Logger.log(`Application running on port ${port}`);
}
bootstrap();
```

Add `PORT` to `.env.dist`:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/naboo
# Jwt
JWT_SECRET=change_me_to_a_strong_random_secret
JWT_EXPIRATION_TIME=604800
# Frontend
FRONTEND_DOMAIN=localhost
FRONTEND_URL=http://localhost:3001
```

---

### P1-6 · Fix `MongooseModule` in `AppModule` to use `ConfigService`

**File:** `src/app.module.ts`

`process.env.MONGO_URI` is read directly without `ConfigService`, bypassing env validation and startup-fail-fast behavior.

```typescript
// src/app.module.ts — AppModule
@Module({
  imports: [
    BaseAppModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGO_URI"),
      }),
    }),
  ],
})
export class AppModule {}
```

> `getOrThrow` makes the app fail fast at startup with a clear message if `MONGO_URI` is missing, instead of a cryptic Mongoose connection error.

---

## P2 — Medium (Improvements / Hardening)

These improve performance, maintainability, and long-term reliability. No breaking changes.

---

### P2-1 · Add Mongoose indexes on `Activity`

**File:** `src/activity/activity.schema.ts`

All queries sort by `createdAt` and filter by `owner` or `city`. Without indexes these are full collection scans.

```typescript
// src/activity/activity.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { User } from "../user/user.schema";
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
@Schema({ timestamps: true })
export class Activity extends Document {
  @Field(() => ID)
  id!: string;

  @Field()
  @Prop({ required: true })
  name!: string;

  @Field()
  @Prop({ required: true, index: true })
  city!: string;

  @Field()
  @Prop({ required: true })
  description!: string;

  @Field()
  @Prop({ required: true })
  price!: number;

  @Field(() => User)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  owner!: User;

  @Field(() => Date, { nullable: true })
  createdAt!: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Compound indexes for common query patterns
ActivitySchema.index({ owner: 1, createdAt: -1 });
ActivitySchema.index({ city: 1, price: 1 });
```

---

### P2-2 · Escape regex in `findByCity` + use `.lean()` for read paths

**File:** `src/activity/activity.service.ts`

User-controlled regex string is a ReDoS vector. Also, read-only list queries can use `.lean()` to return plain objects instead of full Mongoose documents (faster, less memory).

```typescript
// src/activity/activity.service.ts
// Already shown in P1-1 with escapeRegex — add .lean() for list queries

async findAll(): Promise<Activity[]> {
  return this.activityModel
    .find()
    .populate('owner')
    .sort({ createdAt: -1 })
    .lean<Activity[]>()
    .exec();
}

async findLatest(): Promise<Activity[]> {
  return this.activityModel
    .find()
    .populate('owner')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean<Activity[]>()
    .exec();
}

async findByCity(city: string, activity?: string, price?: number): Promise<Activity[]> {
  return this.activityModel
    .find({
      $and: [
        { city },
        ...(price !== undefined ? [{ price }] : []),
        ...(activity
          ? [{ name: { $regex: escapeRegex(activity), $options: 'i' } }]
          : []),
      ],
    })
    .populate('owner')
    .lean<Activity[]>()
    .exec();
}
```

> Note: `.lean()` returns plain objects, not Mongoose Document instances. Ensure `@ResolveField` for `id` still works (lean objects don't have the virtual `id` — use `_id.toString()` explicitly or skip lean for single-document queries).

---

### P2-3 · Replace `updateToken` with `findByIdAndUpdate` (2 → 1 round trip)

**File:** `src/user/user.service.ts`

`updateToken` does `findById` + mutate + `save()` (two DB round trips). Replace with a single `findByIdAndUpdate`. Also remove the `token` field and this method entirely if P1-3 is applied (stateless JWT).

```typescript
// src/user/user.service.ts — if token storage is still needed
async updateToken(id: string, token: string): Promise<User> {
  const user = await this.userModel
    .findByIdAndUpdate(id, { token }, { new: true })
    .exec();
  if (!user) throw new NotFoundException('User not found');
  return user;
}
```

---

### P2-4 · Remove or fix `setDebugMode` in `UserService`

**File:** `src/user/user.service.ts`

`setDebugMode` updates `debugModeEnabled`, but the field is not declared in `user.schema.ts`. With Mongoose `strict: true` (the default), this update is silently dropped.

Either:

- **Option A** (remove): Delete `setDebugMode` — it does nothing useful.
- **Option B** (add to schema): Declare the field if actually needed.

```typescript
// Option B — src/user/user.schema.ts (add field)
@Prop({ default: false })
debugModeEnabled!: boolean;
```

---

### P2-5 · Add GraphQL query depth limit

**File:** `src/app.module.ts`

No depth or complexity limits means a client can send deeply nested queries that chain `owner` → activities → owner indefinitely.

Install: `npm install graphql-depth-limit`

```typescript
// src/app.module.ts — inside GraphQLModule.forRootAsync useFactory return
import depthLimit from 'graphql-depth-limit';

return {
  autoSchemaFile: 'schema.gql',
  sortSchema: true,
  playground: process.env.NODE_ENV !== 'production',
  introspection: process.env.NODE_ENV !== 'production',
  buildSchemaOptions: { numberScalarMode: 'integer' },
  validationRules: [depthLimit(5)],
  context: async ({ req, res }) => { ... },
};
```

---

### P2-6 · Ensure `register` does not return password

**File:** `src/auth/auth.resolver.ts`

After P0-1 removes `@Field()` from `password`, the `register` mutation still returns `User`. The schema will no longer include `password` in `User`, so this is resolved automatically by P0-1. No extra code needed — just verify the regenerated `schema.gql` after applying P0-1.

---

### P2-7 · Standardize JWT transport to `Authorization: Bearer`

**File:** `src/app.module.ts`

`req.headers.jwt` is a non-standard header name. Most proxies, security scanners, and clients expect `Authorization: Bearer <token>`.

```typescript
// src/app.module.ts — context factory
const authHeader = req.headers["authorization"];
const bearerToken = authHeader?.startsWith("Bearer ")
  ? authHeader.slice(7)
  : null;
const cookieToken = req.cookies?.["jwt"] ?? null;
const token = bearerToken ?? cookieToken;
```

> This is a breaking change for the front-end (`req.headers.jwt` → `Authorization: Bearer`). Coordinate with the front-end plan.

---

## P3 — Consistency (naming, structure, import style)

These are cosmetic and structural inconsistencies that do not affect runtime behavior but hurt readability and onboarding.

---

### P3-1 · Align DTOs folder structure across all modules

**Problem:** `auth` centralizes all types in `auth/types/` with a barrel `index.ts`. `activity` keeps its input DTO at module root as `activity.inputs.dto.ts`. `user` has no local types at all. There is no consistent rule.

**Target convention:** every module that owns GraphQL input/output types gets a `types/` subfolder with an `index.ts` barrel, matching the `auth` module pattern.

```
src/
  auth/
    types/
      auth.dto.ts        ← SignInDto (output)
      auth.input.ts      ← SignInInput, SignUpInput
      context.ts         ← GqlContext, ContextWithJWTPayload
      jwtPayload.dto.ts  ← PayloadDto
      index.ts           ← barrel (re-exports all of the above)
  activity/
    types/
      activity.input.ts  ← CreateActivityInput  (renamed from activity.inputs.dto.ts)
      index.ts           ← barrel
  user/
    (no local GQL types — User is the schema itself)
```

Files to move/rename:

- `activity/activity.inputs.dto.ts` → `activity/types/activity.input.ts`
- Update all imports of `CreateActivityInput` accordingly.

---

### P3-2 · Standardize all imports to `src/` absolute paths

**Problem:** Cross-module imports mix `src/module/file` absolute style and `../../module/file` relative style, even within the same file.

Examples of the inconsistency today:

```typescript
// auth.service.ts — two styles in one file
import { User } from "src/user/user.schema"; // absolute
import { UserService } from "../user/user.service"; // relative

// me.resolver.ts — same issue
import { UserService } from "../../user/user.service"; // relative
import { User } from "src/user/user.schema"; // absolute
```

**Fix:** Standardize on `src/` absolute paths for all cross-module imports. Intra-module imports (sibling files) use `./` relative.

```typescript
// Correct pattern
import { UserService } from "src/user/user.service";
import { User } from "src/user/user.schema";
import { AuthGuard } from "src/auth/auth.guard";

// Intra-module (same folder) — relative is fine
import { ActivityService } from "./activity.service";
import { CreateActivityInput } from "./types";
```

Files to update: `auth.service.ts`, `me.resolver.ts`, `seed.module.ts`, `activity.schema.ts`, `seed.service.ts`, and any others with mixed patterns.

---

### P3-3 · Align `@Resolver` decorator style to class reference

**Problem:**

- `auth.resolver.ts` → `@Resolver('Auth')` (string)
- `me.resolver.ts` → `@Resolver('Me')` (string)
- `activity.resolver.ts` → `@Resolver(() => Activity)` (class reference)

The class-reference form is the NestJS code-first standard and provides type safety. String-based resolvers are a legacy pattern from schema-first setups.

**Fix:**

```typescript
// auth.resolver.ts
@Resolver(() => SignInDto)  // or remove @Resolver entirely if no field resolvers

// me.resolver.ts
@Resolver(() => User)
```

---

### P3-4 · Convert `PayloadDto` from `type` to `class`

**File:** `src/auth/types/jwtPayload.dto.ts`

`PayloadDto` is a plain TypeScript `type`, while every other DTO in the project is a `class`. The `Dto` suffix implies a class-based object. It also needs to be added to the `auth/types/index.ts` barrel (currently missing).

```typescript
// src/auth/types/jwtPayload.dto.ts
export class PayloadDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
}
```

```typescript
// src/auth/types/index.ts — add missing exports
export * from "./auth.dto";
export * from "./auth.input";
export * from "./context";
export * from "./jwtPayload.dto";
```

Also rename the file from `jwtPayload.dto.ts` (camelCase) to `jwt-payload.dto.ts` (kebab-case) to match NestJS file naming conventions:

- `auth.dto.ts`, `auth.input.ts`, `auth.guard.ts` are all kebab-case
- `jwtPayload.dto.ts` is the only camelCase file

---

### P3-5 · Move `me.resolver.ts` out of its nested `resolver/` subfolder

**Problem:** `me/resolver/me.resolver.ts` is the only resolver in the entire project nested inside a `resolver/` subfolder. All other resolvers sit at the module root.

**Fix:** Move `src/me/resolver/me.resolver.ts` → `src/me/me.resolver.ts` and update the import in `me.module.ts`.

---

### P3-6 · Rename `userServices` → `userService` in `ActivityResolver`

**File:** `src/activity/activity.resolver.ts`

```typescript
// Before
constructor(
  private readonly activityService: ActivityService,
  private readonly userServices: UserService,  // ← wrong plural
) {}

// After
constructor(
  private readonly activityService: ActivityService,
  private readonly userService: UserService,
) {}
```

---

### P3-7 · Rename resolver mutation parameters for consistency

**File:** `src/auth/auth.resolver.ts`

Mutation argument variable names are inconsistent: `loginUserDto` and `createUserDto` mix verbs that don't match the operation name. They should match the input type name.

```typescript
// Before
async login(@Args('signInInput') loginUserDto: SignInInput, ...)
async register(@Args('signUpInput') createUserDto: SignUpInput)

// After
async login(@Args('signInInput') signInInput: SignInInput, ...)
async register(@Args('signUpInput') signUpInput: SignUpInput)
```

---

### P3-8 · Export `AuthGuard` from `AuthModule`

**File:** `src/auth/auth.module.ts`

`AuthGuard` is imported directly by path from `activity.resolver.ts` and `me.resolver.ts`:

```typescript
import { AuthGuard } from "src/auth/auth.guard";
```

It should be exported from `AuthModule` so consumers depend on the module boundary, not an internal file path. This is consistent with how `UserService` is consumed via `UserModule`.

```typescript
// src/auth/auth.module.ts
@Module({
  imports: [...],
  providers: [AuthService, AuthResolver, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
```

Consumers that already import `AuthModule` (like `ActivityModule`) then get `AuthGuard` automatically without a direct file import.

---

## Summary Table

| ID   | Priority | File(s)                                               | Issue                                                                  |
| ---- | -------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| P0-1 | P0       | `user.schema.ts`                                      | Remove `password` from GraphQL                                         |
| P0-2 | P0       | `app.module.ts`                                       | Invalid JWT must not block public queries                              |
| P0-3 | P0       | `app.service.ts`                                      | Gate seeding behind `NODE_ENV`                                         |
| P1-1 | P1       | `activity.service.ts`, `activity.resolver.ts`         | Fix N+1 `owner` populate + escape regex                                |
| P1-2 | P1       | `seed.module.ts`, `user.module.ts`                    | Fix module architecture (duplicate providers)                          |
| P1-3 | P1       | `auth.service.ts`                                     | Fix exception semantics (`ConflictException`)                          |
| P1-4 | P1       | `auth.resolver.ts`, `app.module.ts`                   | Harden cookie + disable playground in prod                             |
| P1-5 | P1       | `main.ts`, `.env.dist`                                | Port from env, `ValidationPipe` hardening                              |
| P1-6 | P1       | `app.module.ts`                                       | `MongooseModule` use `ConfigService.getOrThrow`                        |
| P2-1 | P2       | `activity.schema.ts`                                  | Add Mongoose indexes                                                   |
| P2-2 | P2       | `activity.service.ts`                                 | `.lean()` + regex escaping                                             |
| P2-3 | P2       | `user.service.ts`                                     | `updateToken` → single `findByIdAndUpdate`                             |
| P2-4 | P2       | `user.service.ts`, `user.schema.ts`                   | Fix or remove `setDebugMode`                                           |
| P2-5 | P2       | `app.module.ts`                                       | Add GraphQL depth limit                                                |
| P2-6 | P2       | `auth.resolver.ts`                                    | Verify `register` response post-P0-1                                   |
| P2-7 | P2       | `app.module.ts`                                       | Standardize JWT transport to `Authorization: Bearer`                   |
| P3-1 | P3       | `activity/activity.inputs.dto.ts` → `activity/types/` | Align DTOs folder structure across all modules                         |
| P3-2 | P3       | All files                                             | Standardize all imports to `src/` absolute paths                       |
| P3-3 | P3       | `auth.resolver.ts`, `me.resolver.ts`                  | Align `@Resolver` style to class reference everywhere                  |
| P3-4 | P3       | `auth/types/jwtPayload.dto.ts`                        | Convert `PayloadDto` type → class; add to barrel `index.ts`            |
| P3-5 | P3       | `auth/types/index.ts`                                 | Export `context.ts` and `jwtPayload.dto.ts` from barrel                |
| P3-6 | P3       | `me/resolver/me.resolver.ts` → `me/me.resolver.ts`    | Move resolver out of nested `resolver/` subfolder                      |
| P3-7 | P3       | `activity.resolver.ts`                                | Rename `userServices` → `userService`                                  |
| P3-8 | P3       | `auth.resolver.ts`                                    | Rename `loginUserDto` → `signInInput`, `createUserDto` → `signUpInput` |
| P3-9 | P3       | `auth.module.ts`                                      | Export `AuthGuard` so dependents import via module, not by path        |
