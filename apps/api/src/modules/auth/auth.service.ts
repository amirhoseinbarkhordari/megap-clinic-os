import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { MembershipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/database.module";
import { LoginDto, RegisterDto } from "./auth.dto";
import { withTenantTransaction } from "../database/tenant-transaction";
import { normalizePhone } from "../../common/normalize-phone";
import type { TenantPrincipal } from "./tenant-context";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const HASH_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
  options: typeof HASH_PARAMS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

type SessionIdentity = { userId: string; tenantId: string; membershipId: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const email = input.email?.trim().toLowerCase() || null;
    const phone = normalizePhone(input.phone);
    if (!email && !phone) throw new BadRequestException("ایمیل یا شماره تلفن الزامی است.");

    const passwordHash = await this.hashPassword(input.password);
    const clinicId = randomUUID();
    const slug = `clinic-${clinicId}`;
    try {
      const identity = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.tenant_id', ${clinicId}, true)`;
        const tenant = await tx.tenant.create({
          data: { id: clinicId, name: input.clinicName.trim(), slug },
        });
        const user = await tx.user.create({
          data: { email, phone, passwordHash, displayName: input.displayName.trim() },
        });
        const role = await tx.role.create({
          data: { tenantId: tenant.id, name: "مالک", key: "owner", isSystem: true },
        });
        const permissions = [
          "clinic.manage",
          "members.manage",
          "patients.manage",
          "appointments.manage",
          "catalog.manage",
          "records.manage",
          "consent.manage",
          "audit.read",
        ];
        await tx.permission.createMany({
          data: permissions.map((key) => ({ key, description: key })),
          skipDuplicates: true,
        });
        await tx.rolePermission.createMany({
          data: permissions.map((permissionKey) => ({
            tenantId: tenant.id,
            roleId: role.id,
            permissionKey,
          })),
        });
        const membership = await tx.membership.create({
          data: { tenantId: tenant.id, userId: user.id, roleId: role.id },
        });
        await tx.branch.create({ data: { tenantId: tenant.id, name: "شعبه اصلی" } });
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planKey: "trial",
            currentPeriodStarts: now,
            currentPeriodEnds: trialEnd,
          },
        });
        return { userId: user.id, tenantId: tenant.id, membershipId: membership.id };
      });
      return this.issueSession(identity);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("این ایمیل یا شماره تلفن قبلاً ثبت شده است.");
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const identifier = input.identifier.trim().toLowerCase();
    const phoneIdentifier = normalizePhone(input.identifier);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, ...(phoneIdentifier ? [{ phone: phoneIdentifier }] : [])],
      },
    });
    if (
      !user ||
      user.disabledAt ||
      !(await this.verifyPassword(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("اطلاعات ورود صحیح نیست.");
    }
    const membership = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
      return tx.membership.findFirst({
        where: { userId: user.id, status: MembershipStatus.ACTIVE },
      });
    });
    if (!membership) throw new UnauthorizedException("عضویت فعالی برای این حساب پیدا نشد.");
    const tenant = await withTenantTransaction(this.prisma, membership.tenantId, (tx) =>
      tx.tenant.findFirst({
        where: { id: membership.tenantId, status: "ACTIVE" },
        select: { id: true },
      }),
    );
    if (!tenant) throw new UnauthorizedException("این کلینیک در دسترس نیست.");
    return this.issueSession({
      userId: user.id,
      tenantId: membership.tenantId,
      membershipId: membership.id,
    });
  }

  async refresh(rawToken?: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawToken) throw new UnauthorizedException("نشست معتبر نیست.");
    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      if (session && !session.revokedAt) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException("نشست منقضی شده است.");
    }
    const revoked = await this.prisma.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new UnauthorizedException("نشست قبلاً استفاده شده است.");
    return this.issueSession({
      userId: session.userId,
      tenantId: session.tenantId,
      membershipId: session.membershipId,
    });
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async profile(principal: TenantPrincipal) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const membership = await tx.membership.findFirst({
        where: {
          id: principal.membershipId,
          userId: principal.userId,
          tenantId: principal.tenantId,
        },
        select: {
          user: { select: { displayName: true, email: true, phone: true } },
          tenant: { select: { name: true, timezone: true, currency: true } },
          role: { select: { name: true, key: true } },
        },
      });
      if (!membership) throw new UnauthorizedException("نشست معتبر نیست.");
      return { ...membership.user, clinic: membership.tenant, role: membership.role };
    });
  }

  private async issueSession(identity: SessionIdentity) {
    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.refreshSession.create({
      data: {
        ...identity,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: identity.userId, tenantId: identity.tenantId, membershipId: identity.membershipId },
      { expiresIn: "10m" },
    );
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await deriveKey(password, salt, 64, HASH_PARAMS);
    return `scrypt$${HASH_PARAMS.N}$${HASH_PARAMS.r}$${HASH_PARAMS.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
  }

  private async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [algorithm, n, r, p, saltValue, hashValue] = encoded.split("$");
    if (algorithm !== "scrypt" || !n || !r || !p || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await deriveKey(password, Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
