# JWT Authentication & RBAC Research for Volunteer Management

**Research Date**: March 12, 2026  
**Framework**: NestJS (Express-based)  
**Requirements**: Three-tier authorization system with JWT authentication

---

## Decision 1: NestJS Guards + Passport JWT Strategy

**Rationale**: NestJS provides a built-in Guards system that integrates seamlessly with Passport.js strategies. This approach is more idiomatic for NestJS than raw Express middleware, offers better TypeScript support, and provides declarative permission control through decorators. Guards are executed after middleware but before route handlers, making them ideal for authorization checks.

**Implementation**:

### Dependencies Required
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
npm install zod
```

### JWT Strategy (Verify Token & Attach User)
```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  tier: 1 | 2 | 3;   // authorization tier
  roles: string[];    // ['parent', 'denLeader'], etc.
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Double-check user still exists and is active
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    
    // Return value is attached to request.user
    return {
      userId: payload.sub,
      email: payload.email,
      tier: payload.tier,
      roles: payload.roles,
    };
  }
}
```

### JWT Auth Guard (Base Authentication)
```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }
}
```

### Tier-Based Authorization Guard
```typescript
// src/auth/guards/tier.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTier = this.reflector.getAllAndOverride<number>('tier', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTier) {
      return true; // No tier requirement
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    // Higher tier numbers have more privileges
    if (user.tier < requiredTier) {
      throw new ForbiddenException(`Requires tier ${requiredTier} access or higher`);
    }

    return true;
  }
}
```

### Custom Decorators for Clean API
```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

// src/auth/decorators/tier.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RequireTier = (tier: 1 | 2 | 3) => SetMetadata('tier', tier);

// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### Usage in Controllers
```typescript
// src/volunteers/volunteers.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TierGuard } from '../auth/guards/tier.guard';
import { RequireTier } from '../auth/decorators/tier.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('volunteers')
@UseGuards(JwtAuthGuard, TierGuard) // Apply to all routes
export class VolunteersController {
  
  // Public route - no authentication needed
  @Public()
  @Get('leaderboard')
  getPublicLeaderboard() {
    return this.volunteersService.getTopVolunteers();
  }

  // Tier 1 (default) - any authenticated user
  @Get('profile')
  getMyProfile(@CurrentUser() user) {
    return this.volunteersService.getProfile(user.userId);
  }

  // Tier 2 - den leaders and committee
  @RequireTier(2)
  @Post('events')
  createEvent(@CurrentUser() user, @Body() eventData) {
    return this.eventsService.create(user.userId, eventData);
  }

  // Tier 3 - site admins only
  @RequireTier(3)
  @Post('activities/configure')
  configureActivity(@Body() activityData) {
    return this.activitiesService.configure(activityData);
  }
}
```

### Auth Module Registration
```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h', // Token expiration
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### Global Guards Setup (Optional)
```typescript
// src/app.module.ts
import { Module } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TierGuard } from './auth/guards/tier.guard';

@Module({
  providers: [
    // Apply JwtAuthGuard globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply TierGuard globally
    {
      provide: APP_GUARD,
      useClass: TierGuard,
    },
  ],
})
export class AppModule {}
```

**Security Considerations**:
- JWT secret must be cryptographically strong (32+ characters, random)
- Token expiration prevents indefinite access (24h recommended, refresh tokens for longer sessions)
- Strategy validation ensures user still exists and is active
- Guards execute in order: authentication first, then authorization
- Public decorator allows opt-out for specific routes
- User object attached to request is TypeScript-typed for safety

**Alternatives Considered**:
- **Raw Express middleware**: Less idiomatic for NestJS, harder to compose, no decorator support
- **Session-based auth**: Requires session store (Redis), more complex scaling, but better for long sessions
- **Custom JWT library**: Passport JWT is battle-tested and well-maintained
- **Role-based instead of tier-based**: More flexible but complex for this use case with clear hierarchy

---

## Decision 2: bcrypt with Async Hashing (Salt Rounds = 12)

**Rationale**: bcrypt is the industry standard for password hashing due to its adaptive nature (cost factor can increase over time) and resistance to rainbow table attacks. Async methods prevent blocking the Node.js event loop during CPU-intensive hashing operations. Salt rounds of 12 balances security (2^12 iterations) with acceptable performance (~150-300ms on modern hardware).

**Implementation**:

### Password Hashing Service
```typescript
// src/auth/password.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12; // Adjust based on hardware
  
  /**
   * Hash a plain text password
   * Time: ~150-300ms on modern CPUs
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.SALT_ROUNDS);
  }
  
  /**
   * Verify a password against a hash
   * Time: ~150-300ms (same as hashing)
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  /**
   * Check if a hash needs rehashing (e.g., SALT_ROUNDS increased)
   * Returns true if current rounds < desired rounds
   */
  needsRehash(hashedPassword: string): boolean {
    const rounds = bcrypt.getRounds(hashedPassword);
    return rounds < this.SALT_ROUNDS;
  }
}
```

### Registration Flow
```typescript
// src/auth/auth.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private jwtService: JwtService,
  ) {}
  
  async register(email: string, password: string, name: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    
    // Hash password (async - non-blocking)
    const hashedPassword = await this.passwordService.hashPassword(password);
    
    // Create user with tier 1 (parent/guardian) by default
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tier: 1,
        roles: ['parent'],
        isActive: true,
      },
    });
    
    // Return JWT token
    return this.generateToken(user);
  }
  
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Verify password (async - non-blocking)
    const isValid = await this.passwordService.verifyPassword(
      password,
      user.password,
    );
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    
    // Optional: Rehash if needed (security improvement over time)
    if (this.passwordService.needsRehash(user.password)) {
      const newHash = await this.passwordService.hashPassword(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }
    
    return this.generateToken(user);
  }
  
  private generateToken(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tier: user.tier,
      roles: user.roles,
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    };
  }
}
```

**Security Considerations**:
- **Never use sync methods** (`hashSync`, `compareSync`) in production - they block the event loop
- **Salt rounds**: 12 is current best practice (2026). Increase to 13-14 if you have powerful hardware
- **Password validation**: Enforce minimum complexity before hashing (8+ chars, mix of types)
- **Timing attacks**: bcrypt.compare is constant-time to prevent timing-based attacks
- **Rehashing**: Automatically upgrade old hashes when users log in
- **Never log passwords**: Always use sanitized logs for auth endpoints
- **Rate limiting**: Prevent brute force (see Decision 4)

**Benchmarks** (as of 2026):
- Rounds 10: ~65ms (too fast - vulnerable to GPU attacks)
- Rounds 12: ~260ms (recommended minimum)
- Rounds 13: ~520ms (good for high-security apps)
- Rounds 14: ~1040ms (max recommended for web apps)

**Alternatives Considered**:
- **Argon2**: Winner of Password Hashing Competition, but bcrypt has broader ecosystem support
- **scrypt**: Good alternative, but bcrypt is more widely tested in Node.js
- **PBKDF2**: Older standard, less resistant to GPU/ASIC attacks than bcrypt
- **Plain SHA-256/SHA-512**: NEVER use for passwords - too fast, no salt, vulnerable

---

## Decision 3: Cryptographically Secure Password Reset Tokens

**Rationale**: Password reset tokens must be unpredictable to prevent account takeover. Using `crypto.randomBytes()` provides cryptographically secure random data. Tokens should be time-limited (1 hour), single-use, and hashed in the database to prevent exposure if the database is compromised.

**Implementation**:

### Password Reset Service
```typescript
// src/auth/password-reset.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private emailService: EmailService,
  ) {}
  
  /**
   * Generate a secure reset token and send email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    // Security: Don't reveal if email exists
    // Always return success to prevent email enumeration
    if (!user) {
      return; // Silent fail
    }
    
    // Generate cryptographically secure token (32 bytes = 256 bits)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing (protect against DB compromise)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Store hashed token with expiration (1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt,
      },
    });
    
    // Send email with unhashed token
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken,
    );
  }
  
  /**
   * Verify token and reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the provided token to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    });
    
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    
    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    
    // Update password and invalidate token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        // Optional: Invalidate all existing sessions
        tokenVersion: { increment: 1 },
      },
    });
  }
  
  /**
   * Cancel password reset (if user didn't request it)
   */
  async cancelReset(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}
```

### Email Service (Example)
```typescript
// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}
  
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    // Use your email provider (SendGrid, Mailgun, AWS SES, etc.)
    // Example structure:
    const emailContent = {
      to: email,
      subject: 'Password Reset Request - Cub Scout Volunteer',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };
    
    // Send via your email service
    // await this.mailProvider.send(emailContent);
  }
}
```

### Prisma Schema Update
```prisma
// prisma/schema.prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String
  name              String
  tier              Int       @default(1)
  roles             String[]  @default(["parent"])
  isActive          Boolean   @default(true)
  
  // Password reset fields
  resetToken        String?   @unique
  resetTokenExpiry  DateTime?
  tokenVersion      Int       @default(0) // For invalidating sessions
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### Controller Endpoint
```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(private passwordResetService: PasswordResetService) {}
  
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    await this.passwordResetService.requestPasswordReset(email);
    // Always return success (don't reveal if email exists)
    return { message: 'If that email exists, a reset link has been sent' };
  }
  
  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    await this.passwordResetService.resetPassword(token, password);
    return { message: 'Password reset successful' };
  }
}
```

**Security Considerations**:
- **Token generation**: Use `crypto.randomBytes()`, never `Math.random()`
- **Token storage**: Hash tokens in database (SHA-256 sufficient for this use case)
- **Email enumeration**: Always return success, never reveal if email exists
- **Expiration**: 1 hour is standard (15 minutes for high-security apps)
- **Single-use**: Invalidate token after successful reset
- **Session invalidation**: Optional but recommended - invalidate existing sessions on reset
- **Rate limiting**: Prevent abuse of reset endpoint (max 3 requests per hour per email)
- **Email security**: Use HTTPS links, mention expiration time in email
- **Token in URL**: Acceptable for email links, but never log reset URLs

**Alternatives Considered**:
- **UUID tokens**: Less entropy than crypto.randomBytes (122 bits vs 256 bits)
- **JWT tokens**: Over-engineered for this use case, harder to invalidate
- **Numeric codes**: Less secure (easier to brute force), but better UX for mobile apps
- **Magic links**: No password reset, just login link - simpler but less control

---

## Decision 4: Rate Limiting + Helmet + CORS + Zod Validation

**Rationale**: Defense in depth requires multiple security layers. Rate limiting prevents brute force attacks, Helmet sets security headers, CORS restricts cross-origin requests, and Zod validates input to prevent injection attacks and ensure type safety.

**Implementation**:

### Dependencies
```bash
npm install @nestjs/throttler helmet zod
npm install -D @types/express
```

### Rate Limiting Configuration
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 3,    // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 seconds
        limit: 20,   // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Apply globally
    },
  ],
})
export class AppModule {}
```

### Stricter Rate Limiting for Auth Endpoints
```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  
  // Login: Max 5 attempts per minute
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
  
  // Registration: Max 3 per hour per IP
  @Public()
  @Throttle({ short: { limit: 3, ttl: 3600000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
  }
  
  // Password reset request: Max 3 per hour
  @Public()
  @Throttle({ short: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.passwordResetService.requestPasswordReset(email);
  }
  
  // Skip rate limiting for certain endpoints (use sparingly)
  @SkipThrottle()
  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
```

### Helmet Security Headers
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply Helmet middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Next.js needs unsafe-inline
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Next.js compatibility
    }),
  );
  
  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // Allow cookies
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### Zod Validation for DTOs
```typescript
// src/auth/dto/auth.dto.ts
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

// Zod schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const PasswordResetSchema = z.object({
  token: z.string().length(64, 'Invalid token format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
});

// DTOs (if using @anatine/zod-nestjs for auto-validation)
export class RegisterDto extends createZodDto(RegisterSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}
export class PasswordResetRequestDto extends createZodDto(PasswordResetRequestSchema) {}
export class PasswordResetDto extends createZodDto(PasswordResetSchema) {}
```

### Manual Zod Validation (Alternative)
```typescript
// src/auth/auth.controller.ts
import { BadRequestException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  
  @Public()
  @Post('register')
  async register(@Body() body: unknown) {
    // Validate with Zod
    const result = RegisterSchema.safeParse(body);
    
    if (!result.success) {
      // Extract error messages
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new BadRequestException({ errors });
    }
    
    const data = result.data; // TypeScript knows the type!
    return this.authService.register(data.email, data.password, data.name);
  }
}
```

### Global Validation Pipe (Class-Validator Alternative)
```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true,        // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  await app.listen(3001);
}
```

### Environment Variables Security
```typescript
// src/config/configuration.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).default('3001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
});

export function validateConfig() {
  const result = ConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

// In app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
  ],
})
export class AppModule {}
```

**Security Considerations**:
- **Rate limiting**: Use conservative limits for auth endpoints to prevent brute force
- **IP-based**: Throttler uses IP by default; consider user-based rate limiting for logged-in users
- **Helmet headers**: Prevents clickjacking, XSS, MIME sniffing attacks
- **CORS**: Whitelist only your frontend domain in production
- **Credentials**: Set to `true` only if using cookies; adds extra CORS restrictions
- **Input validation**: Always validate on backend even if frontend validates
- **Zod vs Class-Validator**: Zod provides compile-time and runtime type safety
- **Whitelist mode**: Strip unexpected properties to prevent mass assignment vulnerabilities

**Rate Limiting Strategy**:
```
Auth Endpoints:
- Login: 5 attempts/min per IP
- Register: 3 attempts/hour per IP
- Password reset: 3 requests/hour per email
- Token refresh: 10 attempts/min per user

API Endpoints:
- Read operations: 100/min per user
- Write operations: 30/min per user
- Admin operations: 60/min per admin
```

**Alternatives Considered**:
- **express-rate-limit**: Good for Express, but @nestjs/throttler is more idiomatic
- **Class-Validator**: Popular in NestJS, but Zod offers better type inference
- **Custom validators**: More flexible but harder to maintain
- **WAF (Cloudflare, AWS)**: Better for production but adds cost
- **Redis-backed rate limiting**: Better for distributed systems but adds complexity

---

## Summary & Next Steps

### Recommended Stack
1. **Authentication**: NestJS Guards + Passport JWT
2. **Password Hashing**: bcrypt (rounds: 12, async methods)
3. **Password Reset**: crypto.randomBytes + SHA-256 hashing + 1-hour expiry
4. **Security**: Helmet + CORS + @nestjs/throttler + Zod validation

### Implementation Order
1. Set up JWT module and strategy
2. Create tier-based guards and decorators
3. Implement password service with bcrypt
4. Add password reset functionality
5. Configure rate limiting and Helmet
6. Add Zod validation to all auth endpoints
7. Test with Postman/Thunder Client

### Environment Variables Needed
```env
# .env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/volunteers
JWT_SECRET=your-super-secure-random-string-at-least-32-chars
FRONTEND_URL=http://localhost:3000
```

### Testing Checklist
- [ ] User can register and receive JWT
- [ ] User can login with valid credentials
- [ ] Invalid credentials return 401
- [ ] JWT expires after 24 hours
- [ ] Password reset email is sent
- [ ] Reset token expires after 1 hour
- [ ] Tier 1 users cannot access tier 2+ endpoints
- [ ] Tier 2 users cannot access tier 3 endpoints
- [ ] Rate limiting blocks excessive requests
- [ ] CORS blocks requests from unauthorized origins
- [ ] Invalid payloads return validation errors
