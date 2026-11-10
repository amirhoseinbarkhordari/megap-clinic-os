import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MembershipStatus } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";

const PUBLIC_ROUTE = "megap:public-route";
const REQUIRED_PERMISSIONS = "megap:required-permissions";
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

export type TenantPrincipal = {
  userId: string;
  tenantId: string;
  membershipId: string;
  roleKey: string;
  permissions: string[];
};

type AuthenticatedRequest = Request & { principal?: TenantPrincipal };

@Injectable()
export class TenantContextGuard {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      Reflect.getMetadata(PUBLIC_ROUTE, context.getHandler()) ||
      Reflect.getMetadata(PUBLIC_ROUTE, context.getClass())
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("ورود به حساب لازم است.");
    let claims: { sub: string; tenantId: string; membershipId: string };
    try {
      claims = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException("نشست معتبر نیست.");
    }
    const membership = await withTenantTransaction(this.prisma, claims.tenantId, (tx) =>
      tx.membership.findFirst({
        where: {
          id: claims.membershipId,
          tenantId: claims.tenantId,
          userId: claims.sub,
          status: MembershipStatus.ACTIVE,
          tenant: { status: "ACTIVE" },
          user: { disabledAt: null },
        },
        include: { role: { include: { permissions: true } } },
      }),
    );
    if (!membership) throw new UnauthorizedException("عضویت فعالی برای این کلینیک وجود ندارد.");
    request.principal = {
      userId: claims.sub,
      tenantId: membership.tenantId,
      membershipId: membership.id,
      roleKey: membership.role.key,
      permissions: membership.role.permissions.map((entry) => entry.permissionKey),
    };
    const requiredPermissions =
      (Reflect.getMetadata(REQUIRED_PERMISSIONS, context.getHandler()) as string[] | undefined) ??
      (Reflect.getMetadata(REQUIRED_PERMISSIONS, context.getClass()) as string[] | undefined) ??
      [];
    if (
      !requiredPermissions.every((permission) =>
        request.principal?.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException("دسترسی لازم برای این عملیات وجود ندارد.");
    }
    return true;
  }
}

export const CurrentTenant = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.principal) throw new UnauthorizedException("زمینه کلینیک پیدا نشد.");
  return request.principal;
});
