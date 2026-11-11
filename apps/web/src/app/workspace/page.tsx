"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { ApiError, networkErrorMessage } from "../../lib/api-error";
import { TextField } from "../../components/text-field";

type Patient = {
  id: string;
  fullName: string;
  phone: string | null;
  branchId: string | null;
  createdAt: string;
};
type PatientPage = { items: Patient[]; page: number; limit: number; total: number };
type Staff = { id: string; displayName: string; branchId: string | null };
type ClinicService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceRial: string;
};
type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "BOOKED" | "CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
  patient: { id: string; fullName: string; phone: string | null };
  staff: { id: string; displayName: string };
  service: { id: string; name: string; durationMinutes: number };
};
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

function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function tehranDateTimeToIso(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match) throw new Error("تاریخ و ساعت نوبت را کامل وارد کنید.");
  return new Date(`${match[1]}T${match[2]}:00+03:30`).toISOString();
}

function normalizeIntegerInput(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
}

function schedulingErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "این زمان برای درمانگر در دسترس نیست؛ نوبت‌ها را تازه‌سازی کنید.";
  }
  return networkErrorMessage(error);
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
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [appointmentPatients, setAppointmentPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [scheduleState, setScheduleState] = useState<"loading" | "ready" | "error">("loading");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleMutationError, setScheduleMutationError] = useState<string | null>(null);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleReload, setScheduleReload] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      setScheduleState("loading");
      setScheduleError(null);
    }, 0);
    const from = new Date().toISOString();
    void Promise.all([
      request<Staff[]>("/staff"),
      request<ClinicService[]>("/services"),
      request<PatientPage>("/patients?page=1&limit=100"),
      request<Appointment[]>(`/appointments?from=${encodeURIComponent(from)}&limit=50`),
    ])
      .then(([staffRows, serviceRows, patientPage, appointmentRows]) => {
        if (!active) return;
        setStaff(staffRows);
        setServices(serviceRows);
        setAppointmentPatients(patientPage.items);
        setAppointments(appointmentRows);
        setScheduleState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setScheduleError(networkErrorMessage(error));
        setScheduleState("error");
      });
    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [request, scheduleReload, status]);

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
      const created = await request<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify({ fullName, phone: phone || undefined }),
      });
      setAppointmentPatients((current) => [created, ...current].slice(0, 100));
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

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scheduleBusy || status !== "authenticated") return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("staffName") ?? "").trim();
    if (name.length < 2 || name.length > 160) {
      setScheduleMutationError("نام درمانگر را کامل وارد کنید.");
      return;
    }
    setScheduleBusy(true);
    setScheduleMutationError(null);
    setScheduleNotice(null);
    try {
      const created = await request<Staff>("/staff", {
        method: "POST",
        body: JSON.stringify({ displayName: name }),
      });
      setStaff((current) =>
        [...current, created].sort((a, b) => a.displayName.localeCompare(b.displayName, "fa")),
      );
      form.reset();
      setScheduleNotice("درمانگر اضافه شد.");
    } catch (error) {
      setScheduleMutationError(schedulingErrorMessage(error));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scheduleBusy || status !== "authenticated") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("serviceName") ?? "").trim();
    const durationMinutes = Number(values.get("durationMinutes"));
    const priceRial = normalizeIntegerInput(String(values.get("priceRial") ?? "0"));
    if (
      name.length < 2 ||
      name.length > 160 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 1440
    ) {
      setScheduleMutationError("نام خدمت و مدت معتبر را وارد کنید.");
      return;
    }
    setScheduleBusy(true);
    setScheduleMutationError(null);
    setScheduleNotice(null);
    try {
      const created = await request<ClinicService>("/services", {
        method: "POST",
        body: JSON.stringify({ name, durationMinutes, priceRial }),
      });
      setServices((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name, "fa")),
      );
      form.reset();
      setScheduleNotice("خدمت به فهرست اضافه شد.");
    } catch (error) {
      setScheduleMutationError(schedulingErrorMessage(error));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scheduleBusy || status !== "authenticated") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const patientId = String(values.get("patientId") ?? "");
    const staffId = String(values.get("staffId") ?? "");
    const serviceId = String(values.get("serviceId") ?? "");
    const startsAt = String(values.get("startsAt") ?? "");
    if (!patientId || !staffId || !serviceId || !startsAt) {
      setScheduleMutationError("مراجع، درمانگر، خدمت و زمان نوبت را انتخاب کنید.");
      return;
    }
    let normalizedStartsAt: string;
    try {
      normalizedStartsAt = tehranDateTimeToIso(startsAt);
    } catch {
      setScheduleMutationError("تاریخ و ساعت نوبت را به‌درستی وارد کنید.");
      return;
    }
    setScheduleBusy(true);
    setScheduleMutationError(null);
    setScheduleNotice(null);
    try {
      const created = await request<Appointment>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          staffId,
          serviceId,
          startsAt: normalizedStartsAt,
        }),
      });
      setAppointments((current) =>
        [...current, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      form.reset();
      setScheduleNotice("نوبت ثبت شد.");
    } catch (error) {
      setScheduleMutationError(schedulingErrorMessage(error));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function updateAppointmentStatus(
    appointment: Appointment,
    nextStatus: "CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW",
  ) {
    if (scheduleBusy) return;
    setScheduleBusy(true);
    setScheduleMutationError(null);
    setScheduleNotice(null);
    try {
      const updated = await request<Appointment>(`/appointments/${appointment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setAppointments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setScheduleNotice("وضعیت نوبت به‌روزرسانی شد.");
    } catch (error) {
      setScheduleMutationError(schedulingErrorMessage(error));
    } finally {
      setScheduleBusy(false);
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
      setAppointmentPatients([]);
      setAppointments([]);
      setStaff([]);
      setServices([]);
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
          <Link className="workspace-nav-unavailable" href="/workspace#schedule-title">
            <span aria-hidden="true">◷</span> نوبت‌دهی
          </Link>
          <span className="workspace-nav-unavailable" aria-disabled="true">
            <span aria-hidden="true">▤</span> پرونده‌ی درمان <small>به‌زودی</small>
          </span>
        </nav>
        <div className="workspace-nav-extra">
          <Link className="workspace-nav-unavailable" href="/workspace/finance">
            مدیریت مالی
          </Link>
          <Link className="workspace-nav-unavailable" href="/workspace/inventory">
            انبار
          </Link>
        </div>
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
                            <th scope="row">
                              {patient.fullName}
                              <Link
                                className="button button-outline patient-record-link"
                                href={`/workspace/patients/${patient.id}/records`}
                              >
                                پرونده درمانی
                              </Link>
                            </th>
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

          <section className="content-card schedule-section" aria-labelledby="schedule-title">
            <div className="card-heading schedule-heading">
              <div>
                <span className="auth-index">مدیریت برنامه‌ی کلینیک</span>
                <h2 id="schedule-title">نوبت‌دهی</h2>
                <p>درمانگر و خدمت را تعریف کنید، سپس برای مراجعه‌کننده نوبت ثبت کنید.</p>
              </div>
              <button
                className="button button-outline"
                type="button"
                onClick={() => setScheduleReload((value) => value + 1)}
                disabled={!authenticated || scheduleState === "loading"}
              >
                تازه‌سازی
              </button>
            </div>

            {scheduleMutationError ? (
              <div className="auth-banner auth-banner-error" role="alert">
                {scheduleMutationError}
              </div>
            ) : null}
            {scheduleNotice ? (
              <div className="auth-banner auth-banner-success" role="status" aria-live="polite">
                {scheduleNotice}
              </div>
            ) : null}

            {scheduleState === "loading" ? (
              <div className="patient-list-state" role="status" aria-live="polite">
                <span className="inline-spinner" aria-hidden="true" />
                <span>در حال دریافت برنامه‌ی کلینیک…</span>
              </div>
            ) : scheduleState === "error" ? (
              <div className="patient-list-state patient-list-error" role="alert">
                <p>{scheduleError}</p>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setScheduleReload((value) => value + 1)}
                >
                  تلاش دوباره
                </button>
              </div>
            ) : !authenticated ? (
              <div className="patient-list-state">برای دیدن نوبت‌ها دوباره وارد شوید.</div>
            ) : (
              <>
                <div className="schedule-setup-grid">
                  <form className="schedule-setup-card" noValidate onSubmit={createStaff}>
                    <h3>درمانگرها</h3>
                    <TextField
                      id="staff-name"
                      name="staffName"
                      label="نام درمانگر"
                      autoComplete="name"
                      maxLength={160}
                      required
                      disabled={scheduleBusy}
                    />
                    <button className="button button-outline" type="submit" disabled={scheduleBusy}>
                      افزودن درمانگر
                    </button>
                    <ul className="schedule-catalog-list">
                      {staff.map((item) => (
                        <li key={item.id}>{item.displayName}</li>
                      ))}
                      {staff.length === 0 ? (
                        <li className="schedule-muted">هنوز درمانگری ثبت نشده</li>
                      ) : null}
                    </ul>
                  </form>

                  <form className="schedule-setup-card" noValidate onSubmit={createService}>
                    <h3>خدمات کلینیک</h3>
                    <TextField
                      id="service-name"
                      name="serviceName"
                      label="نام خدمت"
                      maxLength={160}
                      required
                      disabled={scheduleBusy}
                    />
                    <div className="schedule-two-fields">
                      <TextField
                        id="service-duration"
                        name="durationMinutes"
                        label="مدت (دقیقه)"
                        type="number"
                        min={5}
                        max={1440}
                        required
                        disabled={scheduleBusy}
                      />
                      <TextField
                        id="service-price"
                        name="priceRial"
                        label="هزینه (ریال)"
                        type="text"
                        inputMode="numeric"
                        maxLength={15}
                        disabled={scheduleBusy}
                      />
                    </div>
                    <button className="button button-outline" type="submit" disabled={scheduleBusy}>
                      افزودن خدمت
                    </button>
                    <ul className="schedule-catalog-list">
                      {services.map((item) => (
                        <li key={item.id}>
                          {item.name} <span>{formatDigits(item.durationMinutes)} دقیقه</span>
                        </li>
                      ))}
                      {services.length === 0 ? (
                        <li className="schedule-muted">هنوز خدمتی ثبت نشده</li>
                      ) : null}
                    </ul>
                  </form>
                </div>

                <form className="schedule-booking-form" noValidate onSubmit={createAppointment}>
                  <h3>ثبت نوبت</h3>
                  <div className="schedule-booking-fields">
                    <label className="schedule-field" htmlFor="appointment-patient">
                      <span>مراجع</span>
                      <select
                        id="appointment-patient"
                        name="patientId"
                        required
                        disabled={scheduleBusy || appointmentPatients.length === 0}
                      >
                        <option value="">انتخاب مراجع</option>
                        {appointmentPatients.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="schedule-field" htmlFor="appointment-staff">
                      <span>درمانگر</span>
                      <select
                        id="appointment-staff"
                        name="staffId"
                        required
                        disabled={scheduleBusy || staff.length === 0}
                      >
                        <option value="">انتخاب درمانگر</option>
                        {staff.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="schedule-field" htmlFor="appointment-service">
                      <span>خدمت</span>
                      <select
                        id="appointment-service"
                        name="serviceId"
                        required
                        disabled={scheduleBusy || services.length === 0}
                      >
                        <option value="">انتخاب خدمت</option>
                        {services.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {formatDigits(item.durationMinutes)} دقیقه
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="schedule-field" htmlFor="appointment-starts-at">
                      <span>تاریخ و ساعت (تهران)</span>
                      <input
                        id="appointment-starts-at"
                        name="startsAt"
                        type="datetime-local"
                        required
                        disabled={scheduleBusy}
                      />
                    </label>
                    <button
                      className="button button-primary schedule-submit"
                      type="submit"
                      disabled={
                        scheduleBusy ||
                        appointmentPatients.length === 0 ||
                        staff.length === 0 ||
                        services.length === 0
                      }
                    >
                      ثبت نوبت
                    </button>
                  </div>
                  {appointmentPatients.length === 0 ? (
                    <p className="schedule-help">برای ثبت نوبت ابتدا یک مراجع اضافه کنید.</p>
                  ) : null}
                  {staff.length === 0 || services.length === 0 ? (
                    <p className="schedule-help">
                      برای فعال‌شدن فرم، درمانگر و خدمت را در فهرست بالا تعریف کنید.
                    </p>
                  ) : null}
                </form>

                <div className="schedule-appointments">
                  <div className="card-heading">
                    <div>
                      <h3>نوبت‌های پیش‌رو</h3>
                      <p>تا ۵۰ نوبت آینده</p>
                    </div>
                    <span className="patient-count">{formatDigits(appointments.length)} نوبت</span>
                  </div>
                  {appointments.length === 0 ? (
                    <div className="patient-list-state patient-list-empty">
                      برای این بازه نوبتی ثبت نشده است.
                    </div>
                  ) : (
                    <div className="table-scroll patient-table-scroll">
                      <table className="data-table patient-workspace-table schedule-table">
                        <caption className="visually-hidden">فهرست نوبت‌های آینده</caption>
                        <thead>
                          <tr>
                            <th scope="col">زمان</th>
                            <th scope="col">مراجع</th>
                            <th scope="col">درمانگر</th>
                            <th scope="col">خدمت</th>
                            <th scope="col">وضعیت</th>
                            <th scope="col">عملیات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((item) => (
                            <tr key={item.id}>
                              <td>{formatAppointmentDate(item.startsAt)}</td>
                              <th scope="row">{item.patient.fullName}</th>
                              <td>{item.staff.displayName}</td>
                              <td>{item.service.name}</td>
                              <td>
                                <span
                                  className={`appointment-status appointment-status-${item.status.toLowerCase()}`}
                                >
                                  {
                                    {
                                      BOOKED: "ثبت‌شده",
                                      CONFIRMED: "تأییدشده",
                                      COMPLETED: "انجام‌شده",
                                      CANCELED: "لغوشده",
                                      NO_SHOW: "عدم مراجعه",
                                    }[item.status]
                                  }
                                </span>
                              </td>
                              <td className="schedule-actions">
                                {item.status === "BOOKED" ? (
                                  <>
                                    <button
                                      type="button"
                                      className="schedule-action"
                                      disabled={scheduleBusy}
                                      onClick={() =>
                                        void updateAppointmentStatus(item, "CONFIRMED")
                                      }
                                    >
                                      تأیید
                                    </button>
                                    <button
                                      type="button"
                                      className="schedule-action schedule-action-danger"
                                      disabled={scheduleBusy}
                                      onClick={() => void updateAppointmentStatus(item, "CANCELED")}
                                    >
                                      لغو
                                    </button>
                                  </>
                                ) : item.status === "CONFIRMED" ? (
                                  <>
                                    <button
                                      type="button"
                                      className="schedule-action"
                                      disabled={scheduleBusy}
                                      onClick={() =>
                                        void updateAppointmentStatus(item, "COMPLETED")
                                      }
                                    >
                                      انجام شد
                                    </button>
                                    <button
                                      type="button"
                                      className="schedule-action"
                                      disabled={scheduleBusy}
                                      onClick={() => void updateAppointmentStatus(item, "NO_SHOW")}
                                    >
                                      عدم مراجعه
                                    </button>
                                    <button
                                      type="button"
                                      className="schedule-action schedule-action-danger"
                                      disabled={scheduleBusy}
                                      onClick={() => void updateAppointmentStatus(item, "CANCELED")}
                                    >
                                      لغو
                                    </button>
                                  </>
                                ) : (
                                  <span className="schedule-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
