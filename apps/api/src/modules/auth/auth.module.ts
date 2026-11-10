import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

const secret = process.env.JWT_ACCESS_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("JWT_ACCESS_SECRET must be configured with at least 32 characters.");
}

@Module({
  imports: [JwtModule.register({ secret, signOptions: { issuer: "megap-clinic-os" } })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
