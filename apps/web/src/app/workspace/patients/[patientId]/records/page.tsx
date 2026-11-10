"use client";

import Link from "next/link";
import { FormEvent, use, useCallback, useEffect, useState } from "react";
import { ApiError, networkErrorMessage } from "../../../../../lib/api-error";
import { useAuth } from "../../../../../lib/auth-context";

type Patient = { id: string; fullName: string; phone: string | null; createdAt: string };
type Staff = { id: string; displayName: string };
type Note = { id: string; kind: string; body: string; createdAt: string; authorName: string };
type Encounter = {
  id: string;
  status: "OPEN" | "CLOSED";
  startedAt: string;
  endedAt: string | null;
  staff: { id: string; displayName: string };
  notes: Note[];
};
type Consent = {
  id: string;
  kind: "TREATMENT" | "PRIVACY" | "COMMUNICATION";
  documentVersion: string;
  grantedAt: string;
  revokedAt: string | null;
  recordedByName: string;
};
type RecordSet = { encounters: Encounter[]; consents: Consent[] };
type AuditEvent = {
  id: string;
  action: string;
  resourceType: string;
  occurredAt: string;
  actorMembership: { user: { displayName: string } };
};

const consentNames: Record<Consent["kind"], string> = {
  TREATMENT: "رضایت درمان",
  PRIVACY: "حریم خصوصی",
  COMMUNICATION: "ارتباط و اطلاع‌رسانی",
};
const noteNames: Record<Note["kind"], string> = {
  GENERAL: "یادداشت عمومی",
  EXAMINATION: "معاینه",
  TREATMENT: "اقدام درمانی",
  ADDENDUM: "الحاقیه",
};

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function isPermissionError(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

export default function PatientRecordsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { status, request } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [records, setRecords] = useState<RecordSet>({ encounters: [], consents: [] });
  const [audit, setAudit] = useState<AuditEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId || status !== "authenticated") return;
    setLoading(true);
    setLoadError(null);
    try {
      const [patientRow, recordSet, staffRows] = await Promise.all([
        request<Patient>(`/patients/${patientId}`),
        request<RecordSet>(`/patients/${patientId}/records`),
        request<Staff[]>("/staff"),
      ]);
      setPatient(patientRow);
      setRecords(recordSet);
      setStaff(staffRows);
    } catch (error) {
      setLoadError(
        isPermissionError(error)
          ? "حساب شما اجازه مشاهده پرونده‌های درمانی را ندارد. برای پیگیری با مدیر کلینیک تماس بگیرید."
          : networkErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, request, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const staffId = String(new FormData(form).get("staffId") ?? "");
    if (!staffId) {
      setFormError("ابتدا درمانگر را انتخاب کنید.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await request(`/patients/${patientId}/records/encounters`, {
        method: "POST",
        body: JSON.stringify({ staffId }),
      });
      form.reset();
      setNotice("جلسه درمانی باز شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>, encounterId: string) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = String(values.get("body") ?? "").trim();
    if (body.length < 1 || body.length > 20_000) {
      setFormError("متن یادداشت باید بین ۱ تا ۲۰٬۰۰۰ نویسه باشد.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await request(`/patients/${patientId}/records/encounters/${encounterId}/notes`, {
        method: "POST",
        body: JSON.stringify({ kind: String(values.get("kind")), body }),
      });
      form.reset();
      setNotice("یادداشت به‌صورت رمزگذاری‌شده ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const documentVersion = String(values.get("documentVersion") ?? "").trim();
    if (!documentVersion || documentVersion.length > 80) {
      setFormError("نسخه سند رضایت را وارد کنید (حداکثر ۸۰ نویسه).");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await request(`/patients/${patientId}/records/consents`, {
        method: "POST",
        body: JSON.stringify({ kind: String(values.get("kind")), documentVersion }),
      });
      form.reset();
      setNotice("رضایت بیمار ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeConsent(consentId: string) {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await request(`/patients/${patientId}/records/consents/${consentId}/revoke`, {
        method: "PATCH",
      });
      setNotice("لغو رضایت ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function closeEncounter(encounterId: string) {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await request(`/patients/${patientId}/records/encounters/${encounterId}/close`, {
        method: "POST",
      });
      setClosingId(null);
      setNotice("جلسه درمانی بسته شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadAudit() {
    if (audit) {
      setAudit(null);
      return;
    }
    setFormError(null);
    try {
      setAudit(await request<AuditEvent[]>(`/patients/${patientId}/records/audit`));
    } catch (error) {
      setFormError(
        isPermissionError(error)
          ? "حساب شما اجازه مشاهده سابقه دسترسی را ندارد."
          : networkErrorMessage(error),
      );
    }
  }

  if (status === "restoring") {
    return (
      <main className="records-page">
        <p role="status">در حال آماده‌سازی پرونده…</p>
      </main>
    );
  }
  if (status === "anonymous") {
    return (
      <main className="records-page">
        <div className="records-state" role="alert">
          نشست شما پایان یافته است. <Link href="/login">برای ورود دوباره بروید</Link>.
        </div>
      </main>
    );
  }

  return (
    <main className="records-page" dir="rtl">
      <div className="records-topline">
        <Link href="/workspace">بازگشت به فهرست مراجعان</Link>
        <span>پرونده درمانی · محرمانه</span>
      </div>

      {loading && !patient ? (
        <div className="records-state" role="status" aria-live="polite">
          در حال دریافت پرونده…
        </div>
      ) : loadError ? (
        <div className="records-state records-error" role="alert">
          <p>{loadError}</p>
          <button className="button button-outline" type="button" onClick={() => void load()}>
            تلاش دوباره
          </button>
        </div>
      ) : patient ? (
        <>
          <header className="records-heading">
            <div>
              <span className="auth-index">پرونده الکترونیک سلامت</span>
              <h1>{patient.fullName}</h1>
              <p>
                {patient.phone ? <bdi dir="ltr">{patient.phone}</bdi> : "شماره تماس ثبت نشده"}
                <span aria-hidden="true"> · </span>
                ثبت در {formatMoment(patient.createdAt)}
              </p>
            </div>
            <span className="records-confidential">دسترسی ثبت می‌شود</span>
          </header>

          {formError ? (
            <div className="records-banner records-banner-error" role="alert">
              {formError}
            </div>
          ) : null}
          {notice ? (
            <div className="records-banner records-banner-success" role="status" aria-live="polite">
              {notice}
            </div>
          ) : null}

          <div className="records-grid">
            <section className="content-card records-card" aria-labelledby="encounters-title">
              <div className="records-section-heading">
                <div>
                  <span className="auth-index">سوابق و یادداشت‌ها</span>
                  <h2 id="encounters-title">جلسه‌های درمانی</h2>
                </div>
              </div>

              <form className="records-inline-form" noValidate onSubmit={createEncounter}>
                <label htmlFor="encounter-staff">درمانگر مسئول</label>
                <select
                  id="encounter-staff"
                  name="staffId"
                  defaultValue=""
                  aria-describedby="encounter-help"
                >
                  <option value="">انتخاب درمانگر</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <span id="encounter-help" className="records-field-hint">
                  پس از باز کردن جلسه، یادداشت‌ها به‌صورت رمزگذاری‌شده ذخیره می‌شوند.
                </span>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy || staff.length === 0}
                  aria-busy={busy}
                >
                  {busy ? "در حال ثبت…" : "باز کردن جلسه"}
                </button>
              </form>

              {loading && patient ? (
                <p className="records-muted" role="status">
                  در حال به‌روزرسانی…
                </p>
              ) : null}
              {records.encounters.length === 0 ? (
                <div className="records-empty">هنوز جلسه‌ای برای این مراجعه ثبت نشده است.</div>
              ) : (
                <ol className="encounter-list">
                  {records.encounters.map((encounter) => (
                    <li className="encounter-item" key={encounter.id}>
                      <div className="encounter-marker" aria-hidden="true" />
                      <div className="encounter-body">
                        <div className="encounter-meta">
                          <strong>{formatMoment(encounter.startedAt)}</strong>
                          <span
                            className={
                              encounter.status === "OPEN"
                                ? "records-status is-open"
                                : "records-status"
                            }
                          >
                            {encounter.status === "OPEN" ? "در حال انجام" : "بسته‌شده"}
                          </span>
                        </div>
                        <p className="records-muted">درمانگر: {encounter.staff.displayName}</p>
                        {encounter.notes.map((note) => (
                          <article className="clinical-note" key={note.id}>
                            <div className="clinical-note-meta">
                              <strong>{noteNames[note.kind as Note["kind"]] ?? "یادداشت"}</strong>
                              <span>
                                {formatMoment(note.createdAt)} · {note.authorName}
                              </span>
                            </div>
                            <p>{note.body}</p>
                          </article>
                        ))}
                        {encounter.status === "OPEN" ? (
                          <>
                            <form
                              className="records-note-form"
                              noValidate
                              onSubmit={(event) => void createNote(event, encounter.id)}
                            >
                              <label htmlFor={`note-kind-${encounter.id}`}>نوع یادداشت</label>
                              <select
                                id={`note-kind-${encounter.id}`}
                                name="kind"
                                defaultValue="GENERAL"
                              >
                                <option value="GENERAL">یادداشت عمومی</option>
                                <option value="EXAMINATION">معاینه</option>
                                <option value="TREATMENT">اقدام درمانی</option>
                              </select>
                              <label htmlFor={`note-body-${encounter.id}`}>
                                متن یادداشت بالینی
                              </label>
                              <textarea
                                id={`note-body-${encounter.id}`}
                                name="body"
                                rows={4}
                                maxLength={20_000}
                                placeholder="شرح وضعیت، ارزیابی یا اقدام انجام‌شده…"
                              />
                              <button
                                className="button button-primary"
                                type="submit"
                                disabled={busy}
                                aria-busy={busy}
                              >
                                {busy ? "در حال ثبت…" : "ثبت یادداشت رمزگذاری‌شده"}
                              </button>
                            </form>
                            {closingId === encounter.id ? (
                              <div
                                className="records-confirm"
                                role="group"
                                aria-label="تأیید بستن جلسه"
                              >
                                <span>
                                  پس از بستن، یادداشت تازه به این جلسه اضافه نمی‌شود. ادامه می‌دهید؟
                                </span>
                                <button
                                  type="button"
                                  className="button button-danger-outline"
                                  disabled={busy}
                                  onClick={() => void closeEncounter(encounter.id)}
                                >
                                  بستن جلسه
                                </button>
                                <button
                                  type="button"
                                  className="button button-outline"
                                  onClick={() => setClosingId(null)}
                                >
                                  انصراف
                                </button>
                              </div>
                            ) : (
                              <button
                                className="records-close-button"
                                type="button"
                                disabled={busy}
                                onClick={() => setClosingId(encounter.id)}
                              >
                                پایان جلسه
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <aside className="records-side-column">
              <section className="content-card records-card" aria-labelledby="consents-title">
                <div className="records-section-heading">
                  <div>
                    <span className="auth-index">ثبت و پیگیری</span>
                    <h2 id="consents-title">رضایت‌نامه‌ها</h2>
                  </div>
                </div>
                <form className="records-consent-form" noValidate onSubmit={createConsent}>
                  <label htmlFor="consent-kind">نوع رضایت</label>
                  <select id="consent-kind" name="kind" defaultValue="TREATMENT">
                    <option value="TREATMENT">درمان</option>
                    <option value="PRIVACY">حریم خصوصی</option>
                    <option value="COMMUNICATION">ارتباط و اطلاع‌رسانی</option>
                  </select>
                  <label htmlFor="consent-version">نسخه سند</label>
                  <input
                    id="consent-version"
                    name="documentVersion"
                    maxLength={80}
                    placeholder="مثلاً treatment-v1"
                  />
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={busy}
                    aria-busy={busy}
                  >
                    ثبت رضایت
                  </button>
                </form>
                {records.consents.length === 0 ? (
                  <div className="records-empty">رضایت‌نامه‌ای ثبت نشده است.</div>
                ) : (
                  <ul className="consent-list">
                    {records.consents.map((consent) => (
                      <li key={consent.id}>
                        <div>
                          <strong>{consentNames[consent.kind]}</strong>
                          <span>نسخه {consent.documentVersion}</span>
                          <small>
                            {formatMoment(consent.grantedAt)} · {consent.recordedByName}
                          </small>
                        </div>
                        {consent.revokedAt ? (
                          <span className="records-status">لغوشده</span>
                        ) : (
                          <button
                            className="records-revoke-button"
                            type="button"
                            disabled={busy}
                            onClick={() => void revokeConsent(consent.id)}
                          >
                            لغو رضایت
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="content-card records-card records-audit-card"
                aria-labelledby="audit-title"
              >
                <div className="records-section-heading">
                  <div>
                    <span className="auth-index">شفافیت دسترسی</span>
                    <h2 id="audit-title">سابقه مشاهده پرونده</h2>
                  </div>
                </div>
                <p className="records-muted">مشاهده و تغییر پرونده در سابقه ثبت می‌شود.</p>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => void loadAudit()}
                >
                  {audit ? "پنهان کردن سابقه" : "نمایش رویدادها"}
                </button>
                {audit ? (
                  <ol className="audit-list">
                    {audit.map((event) => (
                      <li key={event.id}>
                        <strong>{event.actorMembership.user.displayName}</strong>
                        <span>{event.action}</span>
                        <time dateTime={event.occurredAt}>{formatMoment(event.occurredAt)}</time>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </main>
  );
}
