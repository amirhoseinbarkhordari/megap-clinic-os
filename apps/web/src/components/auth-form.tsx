"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { networkErrorMessage } from "../lib/api-error";
import { useAuth } from "../lib/auth-context";
import { PasswordField, TextField } from "./text-field";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const { signIn, signUp, status, restoreNotice } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const clinicRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/workspace");
  }, [router, status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setContactError(null);
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");

    if (isRegister) {
      const clinicName = String(values.get("clinicName") ?? "").trim();
      const displayName = String(values.get("displayName") ?? "").trim();
      const email = String(values.get("email") ?? "")
        .trim()
        .toLowerCase();
      const phone = String(values.get("phone") ?? "").trim();
      const confirmation = String(values.get("confirmation") ?? "");
      if (clinicName.length < 2) {
        setError("نام کلینیک را وارد کنید.");
        clinicRef.current?.focus();
        return;
      }
      if (displayName.length < 2) {
        setError("نام و نام خانوادگی را وارد کنید.");
        nameRef.current?.focus();
        return;
      }
      if (!email && !phone) {
        setContactError("ایمیل یا شماره‌ی تلفن را وارد کنید.");
        setError("برای ساخت حساب، دست‌کم یکی از راه‌های تماس لازم است.");
        emailRef.current?.focus();
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setContactError("ساختار ایمیل را بررسی کنید.");
        setError("راه تماس واردشده معتبر نیست.");
        emailRef.current?.focus();
        return;
      }
      if (phone && phone.replace(/[\s()-]/g, "").length < 7) {
        setContactError("شماره‌ی تلفن را کامل وارد کنید.");
        setError("راه تماس واردشده معتبر نیست.");
        phoneRef.current?.focus();
        return;
      }
      if (password.length < 12) {
        setError("رمز عبور باید دست‌کم ۱۲ نویسه داشته باشد.");
        passwordRef.current?.focus();
        return;
      }
      if (password !== confirmation) {
        setError("تکرار رمز عبور با رمز عبور یکسان نیست.");
        confirmationRef.current?.focus();
        return;
      }

      setBusy(true);
      try {
        await signUp({
          clinicName,
          displayName,
          email: email || undefined,
          phone: phone || undefined,
          password,
        });
        router.replace("/workspace");
      } catch (requestError) {
        setError(networkErrorMessage(requestError));
        if (
          requestError instanceof Error &&
          "status" in requestError &&
          requestError.status === 409
        ) {
          setContactError("این ایمیل یا شماره‌ی تلفن قبلاً استفاده شده است.");
        }
        if (passwordRef.current) passwordRef.current.value = "";
        if (confirmationRef.current) confirmationRef.current.value = "";
        passwordRef.current?.focus();
      } finally {
        setBusy(false);
      }
      return;
    }

    const identifier = String(values.get("identifier") ?? "").trim();
    if (!identifier) {
      setError("ایمیل یا شماره‌ی تلفن را وارد کنید.");
      identifierRef.current?.focus();
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await signIn(identifier, password);
      router.replace("/workspace");
    } catch (requestError) {
      setError(networkErrorMessage(requestError));
      if (passwordRef.current) passwordRef.current.value = "";
      passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <aside className="auth-aside" aria-label="درباره‌ی فضای کاری MEGAP">
          <Link className="auth-brand" href="/" aria-label="بازگشت به پیش‌نمایش MEGAP">
            <span className="brand-mark" aria-hidden="true">
              م
            </span>
            <span className="brand-copy">
              <strong>MEGAP</strong>
              <small>سامانه‌ی مدیریت کلینیک</small>
            </span>
          </Link>
          <div className="auth-aside-copy">
            <span className="auth-index">فضای کاری کلینیک</span>
            <h1>
              از پذیرش تا پیگیری،
              <br />
              با نظم پیش بروید.
            </h1>
            <p>مراجعان کلینیک را در فضای کاری اختصاصی خود مدیریت کنید.</p>
            <div className="auth-aside-rule" aria-hidden="true">
              <i />
            </div>
            <small>داده‌های هر کلینیک در محدوده‌ی دسترسی خودش نگهداری می‌شود.</small>
          </div>
          <Link className="auth-preview-link" href="/">
            دیدن پیش‌نمایش نمونه
          </Link>
        </aside>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-panel-heading">
            <span className="auth-index">{isRegister ? "شروع فضای کاری" : "ورود امن"}</span>
            <h2 id="auth-title">{isRegister ? "ساخت حساب کلینیک" : "به کلینیک خود وارد شوید"}</h2>
            <p>
              {isRegister
                ? "مشخصات مدیر و کلینیک را وارد کنید تا فضای کاری ساخته شود."
                : "با ایمیل یا شماره‌ی تلفن و رمز عبور وارد شوید."}
            </p>
          </div>

          {restoreNotice ? (
            <div className="auth-banner auth-banner-info" role="status">
              {restoreNotice}
            </div>
          ) : null}
          {error ? (
            <div className="auth-banner auth-banner-error" role="alert">
              {error}
            </div>
          ) : null}

          <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy}>
            {isRegister ? (
              <>
                <TextField
                  id="clinic-name"
                  name="clinicName"
                  label="نام کلینیک"
                  placeholder="مثلاً کلینیک سپیدار"
                  autoComplete="organization"
                  maxLength={160}
                  ref={clinicRef}
                  required
                />
                <TextField
                  id="display-name"
                  name="displayName"
                  label="نام و نام خانوادگی مدیر"
                  placeholder="نام شما"
                  autoComplete="name"
                  maxLength={160}
                  ref={nameRef}
                  required
                />
                <div className="auth-contact-fields">
                  <TextField
                    id="register-email"
                    name="email"
                    label="ایمیل"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    maxLength={254}
                    ltr
                    error={contactError ?? undefined}
                    ref={emailRef}
                  />
                  <TextField
                    id="register-phone"
                    name="phone"
                    label="شماره‌ی تلفن"
                    type="tel"
                    placeholder="09xx xxx xxxx"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={32}
                    ltr
                    error={contactError ?? undefined}
                    ref={phoneRef}
                  />
                </div>
                <p className="auth-field-note">وارد کردن ایمیل یا شماره‌ی تلفن کافی است.</p>
                <PasswordField
                  id="register-password"
                  name="password"
                  label="رمز عبور"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  hint="حداقل ۱۲ نویسه؛ از گذرواژه‌های تکراری استفاده نکنید."
                  ref={passwordRef}
                  required
                />
                <PasswordField
                  id="register-confirmation"
                  name="confirmation"
                  label="تکرار رمز عبور"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  ref={confirmationRef}
                  required
                />
              </>
            ) : (
              <>
                <TextField
                  id="login-identifier"
                  name="identifier"
                  label="ایمیل یا شماره‌ی تلفن"
                  placeholder="ایمیل یا شماره‌ی تلفن"
                  autoComplete="username"
                  maxLength={254}
                  ltr
                  ref={identifierRef}
                  required
                />
                <PasswordField
                  id="login-password"
                  name="password"
                  label="رمز عبور"
                  autoComplete="current-password"
                  maxLength={128}
                  ref={passwordRef}
                  required
                />
              </>
            )}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={busy || status === "restoring"}
            >
              <span className="button-label">
                {busy ? "در حال بررسی…" : isRegister ? "ساخت فضای کاری" : "ورود به فضای کاری"}
              </span>
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "حساب دارید؟" : "هنوز فضای کاری نساخته‌اید؟"}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "وارد شوید" : "ثبت‌نام کلینیک"}
            </Link>
          </p>
          <p className="auth-recovery-note">
            بازیابی رمز عبور در حال آماده‌سازی است. برای کمک با مدیر سامانه تماس بگیرید.
          </p>
        </section>
      </div>
    </main>
  );
}
