"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { networkErrorMessage } from "../../lib/api-error";
import { TextField } from "../../components/text-field";

type Patient = {
  id: string;
  fullName: string;
  phone: string | null;
  branchId: string | null;
  createdAt: string;
};
type PatientPage = { items: Patient[]; page: number; limit: number; total: number };
const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function formatDigits(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default function WorkspacePage() {
  const router = useRouter();
  const { status, profile, signOut, request } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [queryDraft, setQueryDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (composing) return;
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => {
      setSearch(queryDraft.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [composing, queryDraft, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const suffix = params.toString();
    window.history.replaceState(null, "", suffix ? `/workspace?${suffix}` : "/workspace");
  }, [page, status]);

  useEffect(() => {
    if (status === "restoring") return;
    if (status !== "authenticated") return;

    const controller = new AbortController();
    let current = true;
    const loadingTimer = window.setTimeout(() => {
      setLoadState("loading");
      setLoadError(null);
    }, 0);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    void request<PatientPage>(`/patients?${params}`, { signal: controller.signal })
      .then((result) => {
        if (!current) return;
        setPatients(result.items);
        setTotal(result.total);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;
        setLoadError(networkErrorMessage(error));
        setLoadState("error");
      });
    return () => {
      current = false;
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [page, request, refreshKey, search, status]);

  const retryLoad = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || status !== "authenticated") return;
    setCreating(true);
    setMutationError(null);
    setNotice(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    const fullName = String(values.get("fullName") ?? "").trim();
    const phone = String(values.get("phone") ?? "").trim();
    if (fullName.length < 2) {
      setMutationError("نام مراجع را کامل وارد کنید.");
      const nameField = form.elements.namedItem("fullName");
      if (nameField instanceof HTMLElement) nameField.focus();
      setCreating(false);
      return;
    }
    try {
      await request<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify({ fullName, phone: phone || undefined }),
      });
      form.reset();
      setQueryDraft("");
      setSearch("");
      setNotice("مراجع ثبت شد.");
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMutationError(networkErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      setPatients([]);
      setTotal(0);
      router.replace("/login");
    } catch {
      setSignOutError("خروج از حساب انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.");
    } finally {
      setSigningOut(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const authenticated = status === "authenticated";
  const waitingForSession = status === "restoring";
  const visiblePatients = authenticated ? patients : [];

  return (
    <div className="workspace">
      <aside className="rail">
        <Link className="brand" href="/workspace" aria-label="MEGAP، فضای کاری">
          <span className="brand-mark" aria-hidden="true">
            م
          </span>
          <span className="brand-copy">
            <strong>MEGAP</strong>
            <small>مدیریت کلینیک</small>
          </span>
        </Link>
        <div className="rail-divider" />
        <nav className="workspace-nav" aria-label="بخش‌های کلینیک">
          <span className="workspace-nav-label">فضای کلینیک</span>
          <span className="workspace-nav-current" aria-current="page">
            <span aria-hidden="true">◉</span> مراجعان
          </span>
          <span className="workspace-nav-unavailable" aria-disabled="true">
            <span aria-hidden="true">◷</span> نوبت‌دهی <small>به‌زودی</small>
          </span>
          <span className="workspace-nav-unavailable" aria-disabled="true">
            <span aria-hidden="true">▤</span> پرونده‌ی درمان <small>به‌زودی</small>
          </span>
        </nav>
        <div className="rail-bottom">
          <span className="workspace-secure-note">
            <i aria-hidden="true" /> فضای اختصاصی کلینیک
          </span>
          <Link className="workspace-preview-link" href="/">
            پیش‌نمایش نمونه
          </Link>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar workspace-topbar">
          <div className="topbar-meta">
            <span>فضای کاری</span>
            <b aria-hidden="true">/</b>
            <strong>{profile?.clinic.name ?? "کلینیک"}</strong>
          </div>
          <div className="workspace-account">
            <span className="workspace-account-copy">
              <strong>{profile?.displayName ?? ""}</strong>
              <small>{profile?.role.name ?? ""}</small>
            </span>
            <button
              className="button button-outline workspace-logout"
              type="button"
              onClick={handleSignOut}
              disabled={!authenticated || signingOut}
            >
              {signingOut ? "در حال خروج…" : "خروج"}
            </button>
          </div>
        </header>

        <main className="content workspace-content">
          {!authenticated ? (
            <div className="workspace-session-banner" role={waitingForSession ? "status" : "alert"}>
              <span>
                {waitingForSession
                  ? "در حال بررسی نشست…"
                  : "برای دیدن اطلاعات کلینیک، دوباره وارد شوید."}
              </span>
              {!waitingForSession ? (
                <Link className="button button-secondary" href="/login">
                  ورود به کلینیک
                </Link>
              ) : null}
            </div>
          ) : null}
          {signOutError ? (
            <div className="workspace-session-banner" role="alert">
              {signOutError}
            </div>
          ) : null}

          <section className="workspace-heading">
            <div>
              <span className="auth-index">مدیریت ارتباط با مراجعان</span>
              <h1>مراجعان</h1>
              <p>فهرست و اطلاعات پایه‌ی مراجعان همین کلینیک را مدیریت کنید.</p>
            </div>
            <div className="workspace-total" aria-live="polite">
              <strong>{authenticated ? formatDigits(total) : "—"}</strong>
              <span>مراجع ثبت‌شده</span>
            </div>
          </section>

          <div className="patient-workspace-grid">
            <section
              className="content-card patient-list-card"
              aria-labelledby="patient-list-title"
            >
              <div className="card-heading patient-card-heading">
                <div>
                  <h2 id="patient-list-title">فهرست مراجعان</h2>
                  <p>جست‌وجو در نام و شماره‌ی تماس</p>
                </div>
                <span className="patient-count">
                  {authenticated ? `${formatDigits(total)} مورد` : "نیازمند ورود"}
                </span>
              </div>
              <div className="patient-search-wrap">
                <label className="patient-search-label" htmlFor="patient-search">
                  جست‌وجو
                </label>
                <div className="patient-search-control">
                  <input
                    id="patient-search"
                    type="search"
                    value={queryDraft}
                    onChange={(event) => setQueryDraft(event.target.value)}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={(event) => {
                      setComposing(false);
                      setQueryDraft(event.currentTarget.value);
                    }}
                    placeholder="نام یا شماره‌ی تماس"
                    autoComplete="off"
                    disabled={!authenticated}
                    aria-label="جست‌وجوی مراجعان بر اساس نام یا شماره‌ی تماس"
                  />
                  {queryDraft ? (
                    <button
                      className="patient-search-clear"
                      type="button"
                      aria-label="پاک‌کردن جست‌وجو"
                      onClick={() => {
                        setQueryDraft("");
                        setSearch("");
                        setPage(1);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>

              {loadState === "loading" ? (
                <div className="patient-list-state" role="status" aria-live="polite">
                  <span className="inline-spinner" aria-hidden="true" />
                  <span>در حال دریافت فهرست…</span>
                </div>
              ) : loadState === "error" ? (
                <div className="patient-list-state patient-list-error" role="alert">
                  <p>{loadError}</p>
                  <button className="button button-outline" type="button" onClick={retryLoad}>
                    تلاش دوباره
                  </button>
                </div>
              ) : !authenticated ? (
                <div className="patient-list-state">
                  اطلاعات این بخش پس از ورود نمایش داده می‌شود.
                </div>
              ) : visiblePatients.length === 0 ? (
                <div className="patient-list-state patient-list-empty">
                  <span className="empty-mark" aria-hidden="true">
                    —
                  </span>
                  <strong>{search ? "نتیجه‌ای پیدا نشد" : "هنوز مراجعی ثبت نشده است"}</strong>
                  <span>
                    {search
                      ? "عبارت دیگری جست‌وجو کنید یا جست‌وجو را پاک کنید."
                      : "از فرم کناری، اولین مراجع را به فهرست اضافه کنید."}
                  </span>
                </div>
              ) : (
                <>
                  <div className="table-scroll patient-table-scroll">
                    <table className="data-table patient-workspace-table">
                      <caption className="visually-hidden">فهرست مراجعان ثبت‌شده در کلینیک</caption>
                      <thead>
                        <tr>
                          <th scope="col">نام مراجع</th>
                          <th scope="col">شماره‌ی تماس</th>
                          <th scope="col">تاریخ ثبت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePatients.map((patient) => (
                          <tr key={patient.id}>
                            <th scope="row">{patient.fullName}</th>
                            <td dir="ltr" className="patient-phone-cell">
                              {patient.phone ?? "ثبت نشده"}
                            </td>
                            <td>{formatDate(patient.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <nav className="patient-pagination" aria-label="صفحه‌های فهرست مراجعان">
                    <span>
                      {formatDigits(Math.min((page - 1) * PAGE_SIZE + 1, total))} تا{" "}
                      {formatDigits(Math.min(page * PAGE_SIZE, total))} از {formatDigits(total)}
                    </span>
                    <div>
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        disabled={page <= 1}
                      >
                        قبلی
                      </button>
                      <span aria-current="page">
                        صفحه‌ی {formatDigits(page)} از {formatDigits(pageCount)}
                      </span>
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                        disabled={page >= pageCount}
                      >
                        بعدی
                      </button>
                    </div>
                  </nav>
                </>
              )}
            </section>

            <section
              className="content-card patient-create-card"
              aria-labelledby="patient-create-title"
            >
              <div className="card-heading">
                <div>
                  <span className="auth-index">ثبت در کلینیک</span>
                  <h2 id="patient-create-title">افزودن مراجع</h2>
                </div>
              </div>
              {mutationError ? (
                <div className="auth-banner auth-banner-error" role="alert">
                  {mutationError}
                </div>
              ) : null}
              {notice ? (
                <div className="auth-banner auth-banner-success" role="status" aria-live="polite">
                  {notice}
                </div>
              ) : null}
              <form
                ref={createFormRef}
                className="patient-create-form"
                noValidate
                onSubmit={createPatient}
                aria-busy={creating}
              >
                <TextField
                  id="patient-full-name"
                  name="fullName"
                  label="نام و نام خانوادگی"
                  autoComplete="name"
                  maxLength={160}
                  required
                  disabled={!authenticated || creating}
                />
                <TextField
                  id="patient-phone"
                  name="phone"
                  label="شماره‌ی تماس"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={32}
                  ltr
                  disabled={!authenticated || creating}
                />
                <button
                  className="button button-primary patient-create-submit"
                  type="submit"
                  disabled={!authenticated || creating}
                >
                  {creating ? "در حال ثبت…" : "ثبت مراجع"}
                </button>
              </form>
              <p className="patient-privacy-note">
                اطلاعات این فرم فقط در فهرست همین کلینیک ذخیره می‌شود.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
