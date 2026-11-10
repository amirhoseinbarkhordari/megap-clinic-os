import type { Metadata } from "next";
import { AuthForm } from "../../components/auth-form";

export const metadata: Metadata = { title: "ورود به کلینیک | MEGAP" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
