import { Body, Controller, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { Public } from "./tenant-context";

const COOKIE_NAME = "megap_refresh";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const entry = cookies.find((part) => part.trim().startsWith(`${COOKIE_NAME}=`));
  return entry?.trim().slice(COOKIE_NAME.length + 1);
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Create a clinic and its owner account" })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(body);
    response.cookie(COOKIE_NAME, result.refreshToken, cookieOptions);
    return { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 600 };
  }

  @Post("login")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in to the first active clinic membership" })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body);
    response.cookie(COOKIE_NAME, result.refreshToken, cookieOptions);
    return { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 600 };
  }

  @Post("refresh")
  @Public()
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(readRefreshCookie(request));
    response.cookie(COOKIE_NAME, result.refreshToken, cookieOptions);
    return { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 600 };
  }

  @Post("logout")
  @Public()
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readRefreshCookie(request));
    response.clearCookie(COOKIE_NAME, cookieOptions);
  }
}
