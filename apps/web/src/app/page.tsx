"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type View = "overview" | "appointments" | "patients";
type FormMode = "appointment" | "patient" | null;
type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled";
type Patient = { id: string; name: string; phone: string; joined: string; note: string };
type Appointment = {
  id: string;
  patientId: string;
  date: string;
  time: string;
  service: string;
  staff: string;
  status: AppointmentStatus;
};

const STORAGE_KEY = "megap-clinic-preview-v1";
const SERVER_SNAPSHOT = "__server__";
const SEED_SNAPSHOT = "__seed__";
let memorySnapshot = SEED_SNAPSHOT;
const SERVICES = ["مشاوره پوست", "پاکسازی پوست", "لیزر", "مراقبت پوستی"];
const STAFF = ["دکتر نازنین راد", "سارا موسوی"];
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  "checked-in": "پذیرش‌شده",
  "in-progress": "در حال انجام",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date());
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date(`${date}T12:00:00+03:30`));
}

function createPreviewData() {
  const today = todayKey();
  const patients: Patient[] = [
    { id: "p-1", name: "مینا کریمی", phone: "09120000001", joined: today, note: "مراجع نمونه" },
    { id: "p-2", name: "مریم احمدی", phone: "09120000002", joined: today, note: "مراجع نمونه" },
    { id: "p-3", name: "سارا محمدی", phone: "09120000003", joined: today, note: "مراجع نمونه" },
    { id: "p-4", name: "نگار رضایی", phone: "09120000004", joined: today, note: "مراجع نمونه" },
    { id: "p-5", name: "الهام حسینی", phone: "09120000005", joined: today, note: "مراجع نمونه" },
  ];
  const appointments: Appointment[] = [
    {
      id: "a-1",
      patientId: "p-1",
      date: today,
      time: "۰۹:۰۰",
      service: "مشاوره پوست",
      staff: STAFF[0],
      status: "checked-in",
    },
    {
      id: "a-2",
      patientId: "p-2",
      date: today,
      time: "۰۹:۴۵",
      service: "پاکسازی پوست",
      staff: STAFF[1],
      status: "confirmed",
    },
    {
      id: "a-3",
      patientId: "p-3",
      date: today,
      time: "۱۰:۳۰",
      service: "لیزر",
      staff: STAFF[0],
      status: "confirmed",
    },
    {
      id: "a-4",
      patientId: "p-4",
      date: today,
      time: "۱۱:۱۵",
      service: "مراقبت پوستی",
      staff: STAFF[1],
      status: "pending",
    },
    {
      id: "a-5",
      patientId: "p-5",
      date: today,
      time: "۱۲:۰۰",
      service: "مشاوره پوست",
      staff: STAFF[0],
      status: "confirmed",
    },
  ];
  return { patients, appointments };
}

function getPreviewSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? SEED_SNAPSHOT;
  } catch {
    return memorySnapshot;
  }
}

function subscribePreview(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("megap-preview-update", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("megap-preview-update", onChange);
  };
}

function writePreviewSnapshot(data: { patients: Patient[]; appointments: Appointment[] }) {
  const serialized = JSON.stringify(data);
  memorySnapshot = serialized;
  let persisted = true;
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event("megap-preview-update"));
  return persisted;
}

function parsePreviewSnapshot(snapshot: string) {
  if (snapshot === SERVER_SNAPSHOT || snapshot === SEED_SNAPSHOT) return createPreviewData();
  try {
    const parsed = JSON.parse(snapshot) as { patients?: Patient[]; appointments?: Appointment[] };
    return {
      patients: Array.isArray(parsed.patients) ? parsed.patients : [],
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    };
  } catch {
    return createPreviewData();
  }
}

function Icon({
  name,
}: {
  name: "home" | "calendar" | "users" | "plus" | "search" | "reset" | "clock" | "check";
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";
    const index = persian.indexOf(digit);
    return String(index >= 0 ? index : arabic.indexOf(digit));
  });
}

export default function HomePage() {
  const [view, setView] = useState<View>("overview");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState<"today" | "all">("today");
  const [notice, setNotice] = useState("");
  const snapshot = useSyncExternalStore(
    subscribePreview,
    getPreviewSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const { patients, appointments } = useMemo(() => parsePreviewSnapshot(snapshot), [snapshot]);
  const ready = snapshot !== SERVER_SNAPSHOT;
  const today = ready ? todayKey() : "";

  useEffect(() => {
    if (snapshot === SEED_SNAPSHOT) writePreviewSnapshot(createPreviewData());
  }, [snapshot]);

  function savePreview(data: { patients: Patient[]; appointments: Appointment[] }) {
    if (!writePreviewSnapshot(data)) {
      setNotice("ذخیره‌سازی مرورگر در دسترس نیست؛ تغییرات فقط تا زمان بستن صفحه می‌مانند.");
    }
  }

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const todaysAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.date === today && appointment.status !== "cancelled",
      ),
    [appointments, today],
  );
  const pendingCount = todaysAppointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;
  const filteredAppointments = appointments
    .filter((appointment) => appointmentFilter === "all" || appointment.date === today)
    .filter((appointment) => {
      const patient = patientById.get(appointment.patientId);
      const searchText = `${patient?.name ?? ""} ${patient?.phone ?? ""} ${appointment.service}`;
      return searchText
        .toLocaleLowerCase("fa-IR")
        .includes(query.trim().toLocaleLowerCase("fa-IR"));
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const filteredPatients = patients.filter((patient) =>
    `${patient.name} ${patient.phone}`
      .toLocaleLowerCase("fa-IR")
      .includes(query.trim().toLocaleLowerCase("fa-IR")),
  );
  const selectedPatient = selectedPatientId ? patientById.get(selectedPatientId) : undefined;
  const title = view === "overview" ? "نمای کلی" : view === "appointments" ? "نوبت‌ها" : "مراجعان";

  function resetPreview() {
    const seed = createPreviewData();
    savePreview(seed);
    setSelectedPatientId(null);
    setFormMode(null);
    setNotice("داده‌های نمونه بازنشانی شدند.");
  }

  function updateStatus(id: string, status: AppointmentStatus) {
    savePreview({
      patients,
      appointments: appointments.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    });
    setNotice(`وضعیت نوبت به «${STATUS_LABELS[status]}» تغییر کرد.`);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (formMode === "patient") {
      const name = String(form.get("name") ?? "").trim();
      const phone = normalizeDigits(String(form.get("phone") ?? "")).replace(/\D/g, "");
      if (!name || !/^09\d{9}$/.test(phone)) {
        setNotice("نام را وارد کنید و شماره‌ی همراه ۱۱ رقمی با ۰۹ را بررسی کنید.");
        return;
      }
      const patient: Patient = {
        id: crypto.randomUUID(),
        name,
        phone,
        joined: today || todayKey(),
        note: "ثبت‌شده در پیش‌نمایش",
      };
      savePreview({ patients: [patient, ...patients], appointments });
      setView("patients");
      setQuery("");
      setNotice("مراجع جدید به پیش‌نمایش اضافه شد.");
      setFormMode(null);
      return;
    }

    if (formMode === "appointment") {
      const patientId = String(form.get("patientId") ?? "");
      const date = String(form.get("date") ?? "");
      const time = String(form.get("time") ?? "");
      const service = String(form.get("service") ?? "");
      const staff = String(form.get("staff") ?? "");
      if (!patientById.has(patientId) || !date || !time || !service || !staff) {
        setNotice("همه‌ی فیلدهای نوبت را کامل کنید.");
        return;
      }
      const conflict = appointments.some(
        (appointment) =>
          appointment.date === date &&
          appointment.time === time &&
          appointment.staff === staff &&
          appointment.status !== "cancelled",
      );
      if (conflict) {
        setNotice("این ساعت برای همکار انتخاب‌شده رزرو است؛ زمان دیگری انتخاب کنید.");
        return;
      }
      const appointment: Appointment = {
        id: crypto.randomUUID(),
        patientId,
        date,
        time: new Intl.DateTimeFormat("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone: "Asia/Tehran",
        }).format(new Date(`1970-01-01T${time}:00+03:30`)),
        service,
        staff,
        status: "confirmed",
      };
      savePreview({ patients, appointments: [appointment, ...appointments] });
      setView("appointments");
      setAppointmentFilter(date === today ? "today" : "all");
      setNotice("نوبت جدید در پیش‌نمایش ثبت شد.");
      setFormMode(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="ناوبری اصلی">
        <a className="brand" href="#main" aria-label="MEGAP، صفحه‌ی اصلی">
          <span className="brand-mark">م</span>
          <span className="brand-copy">
            <strong>MEGAP</strong>
            <small>کلینیک OS</small>
          </span>
        </a>
        <div className="clinic-switcher">
          <span className="clinic-avatar">آ</span>
          <span>
            <strong>کلینیک نمونه</strong>
            <small>شعبه‌ی مرکزی</small>
          </span>
          <span className="switch-caret">⌄</span>
        </div>
        <span className="nav-caption">مدیریت کلینیک</span>
        <nav className="primary-nav">
          <button
            className={`nav-item ${view === "overview" ? "is-active" : ""}`}
            onClick={() => {
              setView("overview");
              setFormMode(null);
              setQuery("");
            }}
            aria-current={view === "overview" ? "page" : undefined}
          >
            <Icon name="home" />
            <span>نمای کلی</span>
          </button>
          <button
            className={`nav-item ${view === "appointments" ? "is-active" : ""}`}
            onClick={() => {
              setView("appointments");
              setFormMode(null);
              setQuery("");
            }}
            aria-current={view === "appointments" ? "page" : undefined}
          >
            <Icon name="calendar" />
            <span>نوبت‌ها</span>
            <span className="nav-count">{formatCount(todaysAppointments.length)}</span>
          </button>
          <button
            className={`nav-item ${view === "patients" ? "is-active" : ""}`}
            onClick={() => {
              setView("patients");
              setFormMode(null);
              setQuery("");
            }}
            aria-current={view === "patients" ? "page" : undefined}
          >
            <Icon name="users" />
            <span>مراجعان</span>
          </button>
          <span className="nav-item is-disabled" aria-disabled="true">
            <span className="nav-glyph">♙</span>
            <span>پرسنل</span>
            <small>به‌زودی</small>
          </span>
          <span className="nav-item is-disabled" aria-disabled="true">
            <span className="nav-glyph">▤</span>
            <span>خدمات</span>
            <small>به‌زودی</small>
          </span>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-mark">i</span>
            <span>
              <strong>پیش‌نمایش محصول</strong>
              <small>برای آشنایی با محیط کار</small>
            </span>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">م</span>
            <span>
              <strong>مدیر کلینیک</strong>
              <small>حساب نمایشی</small>
            </span>
            <span className="user-more">•••</span>
          </div>
        </div>
      </aside>

      <section className="app-main" id="main">
        <header className="app-topbar">
          <div className="breadcrumbs">
            <span>MEGAP</span>
            <span className="crumb-separator">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="preview-pill">
              <i />
              پیش‌نمایش آزمایشی
            </span>
            <span className="topbar-date">{today ? dateLabel(today) : "امروز"}</span>
            <button className="avatar-button" aria-label="حساب کاربری نمایشی">
              م
            </button>
          </div>
        </header>

        <div className="preview-notice">
          <span className="notice-mark">!</span>
          <span>
            <strong>نسخه‌ی نمایشی</strong> داده‌ها فقط در همین مرورگر ذخیره می‌شوند؛ اطلاعات واقعی
            بیمار وارد نکنید.
          </span>
          <button onClick={resetPreview} className="reset-button">
            <Icon name="reset" />
            بازنشانی داده‌ی نمونه
          </button>
        </div>

        <div className="page-content">
          {notice && (
            <div className="live-notice" role="status" aria-live="polite">
              <span>{notice}</span>
              <button aria-label="بستن پیام" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}

          <div className="page-heading">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-line" />
                پنل مدیریت کلینیک
              </span>
              <h1>
                {view === "overview" ? "روزتان را با نظم شروع کنید" : title}
                <span className="period">.</span>
              </h1>
              <p>
                {view === "overview"
                  ? "قرارهای امروز و وضعیت کلینیک نمونه را یک‌جا ببینید."
                  : view === "appointments"
                    ? "نوبت‌ها را بررسی کنید، وضعیت‌شان را تغییر دهید یا نوبت تازه بسازید."
                    : "فهرست مراجعان نمونه را جست‌وجو و مدیریت کنید."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button button-secondary"
                onClick={() => {
                  setFormMode("patient");
                  setSelectedPatientId(null);
                }}
              >
                <Icon name="users" />
                ثبت مراجعه‌کننده
              </button>
              <button className="button button-primary" onClick={() => setFormMode("appointment")}>
                <Icon name="plus" />
                ثبت نوبت
              </button>
            </div>
          </div>

          {formMode && (
            <section className="entry-panel" aria-labelledby="entry-title">
              <div className="entry-heading">
                <div>
                  <span className="eyebrow">فرم سریع</span>
                  <h2 id="entry-title">
                    {formMode === "patient" ? "ثبت مراجعه‌کننده‌ی نمونه" : "ثبت نوبت جدید"}
                  </h2>
                </div>
                <button
                  className="close-button"
                  aria-label="بستن فرم"
                  onClick={() => setFormMode(null)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={submitForm} noValidate>
                {formMode === "patient" ? (
                  <div className="form-grid">
                    <label className="field">
                      <span>
                        نام و نام خانوادگی <b>*</b>
                      </span>
                      <input autoFocus name="name" required placeholder="مثلاً: نازنین رضایی" />
                    </label>
                    <label className="field">
                      <span>
                        شماره‌ی همراه <b>*</b>
                      </span>
                      <input
                        name="phone"
                        required
                        inputMode="tel"
                        dir="ltr"
                        placeholder="09120000000"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="form-grid form-grid-four">
                    <label className="field">
                      <span>
                        مراجع <b>*</b>
                      </span>
                      <select name="patientId" required defaultValue="">
                        <option value="" disabled>
                          انتخاب مراجع
                        </option>
                        {patients.map((patient) => (
                          <option value={patient.id} key={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>
                        خدمت <b>*</b>
                      </span>
                      <select name="service" required defaultValue={SERVICES[0]}>
                        {SERVICES.map((service) => (
                          <option key={service}>{service}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>
                        همکار <b>*</b>
                      </span>
                      <select name="staff" required defaultValue={STAFF[0]}>
                        {STAFF.map((staff) => (
                          <option key={staff}>{staff}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>
                        تاریخ و ساعت <b>*</b>
                      </span>
                      <div className="date-time-field">
                        <input
                          aria-label="تاریخ نوبت"
                          type="date"
                          name="date"
                          required
                          defaultValue={today}
                        />
                        <input
                          aria-label="ساعت نوبت"
                          type="time"
                          name="time"
                          required
                          defaultValue="13:00"
                        />
                      </div>
                    </label>
                  </div>
                )}
                {formMode === "appointment" && patients.length === 0 && (
                  <p className="inline-help">برای ثبت نوبت، ابتدا یک مراجعه‌کننده اضافه کنید.</p>
                )}
                <div className="form-actions">
                  <span className="required-note">فیلدهای ستاره‌دار الزامی هستند.</span>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setFormMode(null)}
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={formMode === "appointment" && patients.length === 0}
                  >
                    {formMode === "patient" ? "ثبت مراجعه‌کننده" : "ثبت نوبت"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {!ready ? (
            <div className="loading-panel" aria-live="polite">
              در حال آماده‌سازی پیش‌نمایش…
            </div>
          ) : view === "overview" ? (
            <>
              <section className="metric-grid" aria-label="خلاصه‌ی امروز">
                <article className="metric-card">
                  <span className="metric-icon metric-green">
                    <Icon name="calendar" />
                  </span>
                  <span className="metric-label">نوبت امروز</span>
                  <strong>{formatCount(todaysAppointments.length)}</strong>
                  <small>نوبت فعال در برنامه‌ی امروز</small>
                  <span className="metric-decoration">
                    {formatCount(todaysAppointments.length)}
                  </span>
                </article>
                <article className="metric-card">
                  <span className="metric-icon metric-gold">
                    <Icon name="clock" />
                  </span>
                  <span className="metric-label">در انتظار تأیید</span>
                  <strong>{formatCount(pendingCount)}</strong>
                  <small>
                    {pendingCount ? "برای پیگیری پذیرش" : "همه‌ی نوبت‌ها بررسی شده‌اند"}
                  </small>
                  <span className="metric-decoration">{formatCount(pendingCount)}</span>
                </article>
                <article className="metric-card">
                  <span className="metric-icon metric-neutral">
                    <Icon name="users" />
                  </span>
                  <span className="metric-label">مراجعان نمونه</span>
                  <strong>{formatCount(patients.length)}</strong>
                  <small>داده‌ی آزمایشی در این مرورگر</small>
                  <span className="metric-decoration">{formatCount(patients.length)}</span>
                </article>
              </section>

              <section className="overview-grid">
                <div className="content-card agenda-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">برنامه‌ی روز</span>
                      <h2>نوبت‌های امروز</h2>
                    </div>
                    <button
                      className="text-action"
                      onClick={() => {
                        setView("appointments");
                        setQuery("");
                      }}
                    >
                      مشاهده‌ی همه <span aria-hidden="true">←</span>
                    </button>
                  </div>
                  {todaysAppointments.length ? (
                    <div className="agenda-list">
                      {todaysAppointments.slice(0, 5).map((appointment) => (
                        <AppointmentRow
                          key={appointment.id}
                          appointment={appointment}
                          patient={patientById.get(appointment.patientId)}
                          onStatusChange={updateStatus}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="برای امروز نوبتی ثبت نشده"
                      detail="از دکمه‌ی ثبت نوبت برای شروع استفاده کنید."
                      onAction={() => setFormMode("appointment")}
                    />
                  )}
                </div>
                <aside className="content-card today-card">
                  <span className="eyebrow">نمای روز</span>
                  <div className="today-date">
                    <strong>
                      {today
                        ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                            day: "numeric",
                            timeZone: "Asia/Tehran",
                          }).format(new Date(`${today}T12:00:00+03:30`))
                        : "—"}
                    </strong>
                    <span>
                      <b>
                        {today
                          ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                              month: "long",
                              timeZone: "Asia/Tehran",
                            }).format(new Date(`${today}T12:00:00+03:30`))
                          : "امروز"}
                      </b>
                      <small>
                        {today
                          ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                              weekday: "long",
                              timeZone: "Asia/Tehran",
                            }).format(new Date(`${today}T12:00:00+03:30`))
                          : ""}
                      </small>
                    </span>
                  </div>
                  <div className="today-divider" />
                  <div className="today-stat">
                    <span>نوبت‌های فعال</span>
                    <strong>{formatCount(todaysAppointments.length)}</strong>
                  </div>
                  <div className="today-stat">
                    <span>اولین نوبت</span>
                    <strong>{todaysAppointments[0]?.time ?? "—"}</strong>
                  </div>
                  <div className="today-stat">
                    <span>آخرین نوبت</span>
                    <strong>{todaysAppointments.at(-1)?.time ?? "—"}</strong>
                  </div>
                  <button
                    className="button button-outline full-button"
                    onClick={() => {
                      setView("appointments");
                      setQuery("");
                    }}
                  >
                    رفتن به برنامه‌ی نوبت‌ها <span aria-hidden="true">←</span>
                  </button>
                </aside>
              </section>
            </>
          ) : view === "appointments" ? (
            <section className="content-card list-card">
              <div className="list-toolbar">
                <div className="segmented" role="group" aria-label="فیلتر نوبت‌ها">
                  <button
                    className={appointmentFilter === "today" ? "selected" : ""}
                    onClick={() => setAppointmentFilter("today")}
                  >
                    امروز
                  </button>
                  <button
                    className={appointmentFilter === "all" ? "selected" : ""}
                    onClick={() => setAppointmentFilter("all")}
                  >
                    همه‌ی نوبت‌ها
                  </button>
                </div>
                <label className="search-box">
                  <Icon name="search" />
                  <input
                    aria-label="جست‌وجوی نوبت"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جست‌وجوی نام یا خدمت"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="پاک کردن جست‌وجو"
                      onClick={() => setQuery("")}
                    >
                      ×
                    </button>
                  )}
                </label>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>زمان و تاریخ</th>
                      <th>مراجع</th>
                      <th>خدمت</th>
                      <th>همکار</th>
                      <th>وضعیت نوبت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <strong className="time-cell">{appointment.time}</strong>
                          <small>{dateLabel(appointment.date)}</small>
                        </td>
                        <td>
                          <span className="table-person">
                            <i>{patientById.get(appointment.patientId)?.name.slice(0, 1) ?? "م"}</i>
                            <span>
                              <strong>
                                {patientById.get(appointment.patientId)?.name ?? "مراجع حذف‌شده"}
                              </strong>
                              <small dir="ltr">
                                {patientById.get(appointment.patientId)?.phone ?? ""}
                              </small>
                            </span>
                          </span>
                        </td>
                        <td>{appointment.service}</td>
                        <td>{appointment.staff}</td>
                        <td>
                          <StatusSelect appointment={appointment} onStatusChange={updateStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAppointments.length === 0 && (
                  <EmptyState
                    title={query ? "نتیجه‌ای پیدا نشد" : "نوبتی در این بازه نیست"}
                    detail={
                      query
                        ? "عبارت جست‌وجو را تغییر دهید یا پاک کنید."
                        : "یک نوبت تازه ثبت کنید تا این فهرست تکمیل شود."
                    }
                    onAction={query ? () => setQuery("") : () => setFormMode("appointment")}
                    actionLabel={query ? "پاک کردن جست‌وجو" : "ثبت نوبت"}
                  />
                )}
              </div>
              <div className="list-footer">
                <span>{formatCount(filteredAppointments.length)} نوبت</span>
                <span>ذخیره‌شده در پیش‌نمایش همین مرورگر</span>
              </div>
            </section>
          ) : (
            <section className="patients-layout">
              <div className="content-card list-card">
                <div className="list-toolbar">
                  <div>
                    <span className="eyebrow">دفتر مراجعان</span>
                    <h2 className="list-title">
                      همه‌ی مراجعان <span>{formatCount(filteredPatients.length)}</span>
                    </h2>
                  </div>
                  <label className="search-box">
                    <Icon name="search" />
                    <input
                      aria-label="جست‌وجوی مراجعان"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="نام یا شماره‌ی همراه"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="پاک کردن جست‌وجو"
                        onClick={() => setQuery("")}
                      >
                        ×
                      </button>
                    )}
                  </label>
                </div>
                <div className="table-scroll">
                  <table className="data-table patient-table">
                    <thead>
                      <tr>
                        <th>مراجع</th>
                        <th>شماره‌ی همراه</th>
                        <th>عضویت</th>
                        <th>نوبت‌ها</th>
                        <th>پرونده</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id}>
                          <td>
                            <span className="table-person">
                              <i>{patient.name.slice(0, 1)}</i>
                              <span>
                                <strong>{patient.name}</strong>
                                <small>{patient.note}</small>
                              </span>
                            </span>
                          </td>
                          <td dir="ltr" className="phone-cell">
                            {patient.phone}
                          </td>
                          <td>{dateLabel(patient.joined)}</td>
                          <td>
                            {formatCount(
                              appointments.filter(
                                (appointment) =>
                                  appointment.patientId === patient.id &&
                                  appointment.status !== "cancelled",
                              ).length,
                            )}
                          </td>
                          <td>
                            <button
                              className="row-action"
                              onClick={() =>
                                setSelectedPatientId(
                                  selectedPatientId === patient.id ? null : patient.id,
                                )
                              }
                            >
                              {selectedPatientId === patient.id ? "بستن" : "نمایش"}
                              <span aria-hidden="true">←</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPatients.length === 0 && (
                    <EmptyState
                      title={query ? "مراجعی پیدا نشد" : "هنوز مراجعه‌کننده‌ای ثبت نشده"}
                      detail={
                        query
                          ? "نام یا شماره‌ی دیگری را جست‌وجو کنید."
                          : "اولین مراجعه‌کننده را به پیش‌نمایش اضافه کنید."
                      }
                      onAction={query ? () => setQuery("") : () => setFormMode("patient")}
                      actionLabel={query ? "پاک کردن جست‌وجو" : "ثبت مراجعه‌کننده"}
                    />
                  )}
                </div>
              </div>
              {selectedPatient && (
                <aside className="content-card patient-detail">
                  <div className="detail-top">
                    <span className="eyebrow">پروفایل نمونه</span>
                    <button
                      className="close-button"
                      aria-label="بستن پروفایل"
                      onClick={() => setSelectedPatientId(null)}
                    >
                      ×
                    </button>
                  </div>
                  <span className="detail-avatar">{selectedPatient.name.slice(0, 1)}</span>
                  <h2>{selectedPatient.name}</h2>
                  <span dir="ltr" className="detail-phone">
                    {selectedPatient.phone}
                  </span>
                  <div className="today-divider" />
                  <div className="today-stat">
                    <span>تعداد نوبت‌ها</span>
                    <strong>
                      {formatCount(
                        appointments.filter(
                          (appointment) => appointment.patientId === selectedPatient.id,
                        ).length,
                      )}
                    </strong>
                  </div>
                  <div className="today-stat">
                    <span>تاریخ عضویت</span>
                    <strong>{dateLabel(selectedPatient.joined)}</strong>
                  </div>
                  <p className="private-note">نمایش پرونده‌ی درمانی در این پیش‌نمایش فعال نیست.</p>
                </aside>
              )}
            </section>
          )}

          <footer className="app-footer">
            <span>
              MEGAP Clinic OS <b>نسخه‌ی پیش‌نمایش ۰.۲</b>
            </span>
            <span>تقویم شمسی · منطقه‌ی زمانی تهران</span>
          </footer>
        </div>
      </section>
      <nav className="mobile-nav" aria-label="ناوبری موبایل">
        <button
          className={view === "overview" ? "active" : ""}
          onClick={() => setView("overview")}
          aria-current={view === "overview" ? "page" : undefined}
        >
          <Icon name="home" />
          <span>خانه</span>
        </button>
        <button
          className={view === "appointments" ? "active" : ""}
          onClick={() => setView("appointments")}
          aria-current={view === "appointments" ? "page" : undefined}
        >
          <Icon name="calendar" />
          <span>نوبت‌ها</span>
        </button>
        <button
          className={view === "patients" ? "active" : ""}
          onClick={() => setView("patients")}
          aria-current={view === "patients" ? "page" : undefined}
        >
          <Icon name="users" />
          <span>مراجعان</span>
        </button>
        <button
          className="mobile-add"
          onClick={() => setFormMode("appointment")}
          aria-label="ثبت نوبت"
        >
          <Icon name="plus" />
        </button>
      </nav>
    </main>
  );
}

function StatusSelect({
  appointment,
  onStatusChange,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  return (
    <label className={`status-select status-${appointment.status}`}>
      <span className="status-dot" />
      <select
        aria-label={`وضعیت نوبت ${appointment.time} برای ${STATUS_LABELS[appointment.status]}`}
        value={appointment.status}
        onChange={(event) =>
          onStatusChange(appointment.id, event.target.value as AppointmentStatus)
        }
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AppointmentRow({
  appointment,
  patient,
  onStatusChange,
  compact = false,
}: {
  appointment: Appointment;
  patient?: Patient;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  compact?: boolean;
}) {
  return (
    <div className={`agenda-row ${appointment.status === "cancelled" ? "is-cancelled" : ""}`}>
      <span className="agenda-time">{appointment.time}</span>
      <span className="agenda-mark" />
      <span className="agenda-main">
        <strong>{patient?.name ?? "مراجع حذف‌شده"}</strong>
        <small>
          {appointment.service} <span>·</span> {appointment.staff}
        </small>
      </span>
      <StatusSelect appointment={appointment} onStatusChange={onStatusChange} />
      {!compact && <span>{dateLabel(appointment.date)}</span>}
    </div>
  );
}

function EmptyState({
  title,
  detail,
  onAction,
  actionLabel = "ثبت نوبت",
}: {
  title: string;
  detail: string;
  onAction: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="check" />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
      <button className="button button-secondary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
