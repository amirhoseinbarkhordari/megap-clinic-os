"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { TextField } from "../../../components/text-field";
import { networkErrorMessage } from "../../../lib/api-error";
import { useAuth } from "../../../lib/auth-context";

type Patient = { id: string; fullName: string };
type Invoice = {
  id: string;
  patientId: string;
  patientName: string;
  totalRial: string;
  paidRial: string;
  balanceRial: string;
  status: "OPEN" | "PARTIAL" | "PAID";
  createdAt: string;
  lines: Array<{ id: string; description: string; quantity: number; lineTotalRial: string }>;
};
type Entry = {
  id: string;
  kind: "PAYMENT" | "REFUND" | "EXPENSE";
  direction: "INCOME" | "OUTGOING";
  amountRial: string;
  invoiceId: string | null;
  memo: string | null;
  createdAt: string;
  reverseCount: number;
  patient?: { fullName: string } | null;
};
type Summary = { incomeRial: string; outgoingRial: string; netRial: string; currency: string };

function operationKey(keys: Map<string, string>, scope: string, payload: unknown) {
  const fingerprint = `${scope}:${JSON.stringify(payload)}`;
  let key = keys.get(fingerprint);
  if (!key) {
    key = crypto.randomUUID();
    keys.set(fingerprint, key);
  }
  return { fingerprint, key };
}

function formatRial(value: string) {
  return `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
}

function parseRial(value: string) {
  return digits(value).replace(/\D/g, "");
}

function digits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default function FinancePage() {
  const { status, profile, request } = useAuth();
  const canManageFinance = profile?.permissions.includes("finance.manage") ?? false;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [invoiceLineIds, setInvoiceLineIds] = useState([0]);
  const [nextInvoiceLineId, setNextInvoiceLineId] = useState(1);
  const [idempotencyKeys] = useState(() => new Map<string, string>());

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setLoadError(null);
    try {
      const [patientRows, invoiceRows, ledgerRows, totals] = await Promise.all([
        request<Patient[]>("/finance/patients"),
        request<Invoice[]>("/finance/invoices?limit=100"),
        request<Entry[]>("/finance/ledger?limit=100"),
        request<Summary>("/finance/summary"),
      ]);
      setPatients(patientRows);
      setInvoices(invoiceRows);
      setEntries(ledgerRows);
      setSummary(totals);
    } catch (error) {
      setLoadError(networkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [request, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const patientId = String(values.get("patientId") ?? "");
    const lines = invoiceLineIds.map((id) => ({
      description: String(values.get(`description-${id}`) ?? "").trim(),
      quantity: Number(digits(String(values.get(`quantity-${id}`) ?? ""))),
      unitPriceRial: parseRial(String(values.get(`amount-${id}`) ?? "")),
    }));
    if (
      !patientId ||
      lines.some(
        (line) =>
          line.description.length < 2 ||
          line.description.length > 240 ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 100_000 ||
          !line.unitPriceRial,
      )
    ) {
      setFormError("مراجع و برای هر ردیف شرح، تعداد و مبلغ معتبر به ریال وارد کنید.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = { patientId, lines };
      const operation = operationKey(idempotencyKeys, "invoice", payload);
      await request("/finance/invoices", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: operation.key }),
      });
      idempotencyKeys.delete(operation.fingerprint);
      form.reset();
      setInvoiceLineIds([0]);
      setNextInvoiceLineId(1);
      setNotice("فاکتور قطعی ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>, invoiceId: string) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountRial = parseRial(String(values.get("amountRial") ?? ""));
    if (!amountRial || BigInt(amountRial) < 1n) {
      setFormError("مبلغ پرداخت را به ریال وارد کنید.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = { invoiceId, amountRial, paymentMethod: String(values.get("paymentMethod")) };
      const operation = operationKey(idempotencyKeys, "payment", payload);
      await request("/finance/payments", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: operation.key }),
      });
      idempotencyKeys.delete(operation.fingerprint);
      form.reset();
      setPayingInvoiceId(null);
      setNotice("پرداخت در دفترکل ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const description = String(values.get("description") ?? "").trim();
    const amountRial = parseRial(String(values.get("amountRial") ?? ""));
    if (description.length < 2 || !amountRial || BigInt(amountRial) < 1n) {
      setFormError("شرح هزینه و مبلغ صحیح به ریال را وارد کنید.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = {
        description,
        amountRial,
        paymentMethod: String(values.get("paymentMethod")),
      };
      const operation = operationKey(idempotencyKeys, "expense", payload);
      await request("/finance/expenses", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: operation.key }),
      });
      idempotencyKeys.delete(operation.fingerprint);
      form.reset();
      setNotice("هزینه در دفترکل ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function refundPayment(entryId: string) {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = { paymentEntryId: entryId };
      const operation = operationKey(idempotencyKeys, "refund", payload);
      await request("/finance/refunds", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: operation.key }),
      });
      idempotencyKeys.delete(operation.fingerprint);
      setRefundTarget(null);
      setNotice("برگشت کامل پرداخت در دفترکل ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="records-page finance-page" dir="rtl">
      <div className="records-topline">
        <Link href="/workspace">بازگشت به فضای کلینیک</Link>
        <nav aria-label="ماژول‌ها">
          <Link aria-current="page" href="/workspace/finance">
            مالی
          </Link>
          <Link href="/workspace/inventory">انبار</Link>
        </nav>
      </div>
      <header className="records-heading">
        <div>
          <span className="auth-index">دفترکل کلینیک · ریال</span>
          <h1>مدیریت مالی</h1>
          <p>فاکتور قطعی، دریافت مرحله‌ای و ثبت تغییرناپذیر تراکنش‌ها</p>
        </div>
        <span className="records-confidential">تراکنش نهایی قابل ویرایش نیست</span>
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
      {loadError ? (
        <div className="records-state records-error" role="alert">
          <p>{loadError}</p>
          <button className="button button-outline" type="button" onClick={() => void load()}>
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {summary ? (
        <section className="finance-summary" aria-label="خلاصه دفترکل">
          <article className="content-card">
            <span>درآمد ثبت‌شده</span>
            <strong>{formatRial(summary.incomeRial)}</strong>
          </article>
          <article className="content-card">
            <span>هزینه و برگشت</span>
            <strong>{formatRial(summary.outgoingRial)}</strong>
          </article>
          <article className="content-card">
            <span>خالص گردش</span>
            <strong>{formatRial(summary.netRial)}</strong>
          </article>
        </section>
      ) : null}

      <div className="finance-grid">
        <section className="content-card records-card" aria-labelledby="invoice-title">
          <div className="records-section-heading">
            <div>
              <span className="auth-index">دریافت از مراجع</span>
              <h2 id="invoice-title">ایجاد فاکتور</h2>
            </div>
          </div>
          <form className="finance-form" noValidate onSubmit={createInvoice}>
            <label htmlFor="invoice-patient">مراجع</label>
            <select id="invoice-patient" name="patientId" defaultValue="">
              <option value="">انتخاب مراجع</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
            {invoiceLineIds.map((lineId, index) => (
              <fieldset className="invoice-draft-line" key={lineId}>
                <legend>ردیف {new Intl.NumberFormat("fa-IR").format(index + 1)}</legend>
                <TextField
                  id={`invoice-description-${lineId}`}
                  label="شرح خدمت یا کالا"
                  name={`description-${lineId}`}
                  maxLength={240}
                  placeholder="مثلاً جلسه مشاوره پوست"
                />
                <div className="invoice-line-numbers">
                  <TextField
                    id={`invoice-quantity-${lineId}`}
                    label="تعداد"
                    name={`quantity-${lineId}`}
                    inputMode="numeric"
                    defaultValue="۱"
                  />
                  <TextField
                    id={`invoice-amount-${lineId}`}
                    label="بهای واحد (ریال)"
                    name={`amount-${lineId}`}
                    inputMode="numeric"
                    placeholder="مبلغ به ریال"
                  />
                </div>
                {invoiceLineIds.length > 1 ? (
                  <button
                    className="records-revoke-button invoice-remove-line"
                    type="button"
                    onClick={() =>
                      setInvoiceLineIds((current) => current.filter((id) => id !== lineId))
                    }
                  >
                    حذف این ردیف
                  </button>
                ) : null}
              </fieldset>
            ))}
            <button
              className="button button-outline"
              type="button"
              onClick={() => {
                setInvoiceLineIds((current) => [...current, nextInvoiceLineId]);
                setNextInvoiceLineId((current) => current + 1);
              }}
            >
              افزودن ردیف
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={busy || !canManageFinance || patients.length === 0}
              aria-busy={busy}
            >
              {busy ? "در حال ثبت…" : "ثبت فاکتور قطعی"}
            </button>
          </form>
          <div className="records-section-heading finance-list-heading">
            <div>
              <span className="auth-index">دریافت کامل یا مرحله‌ای</span>
              <h2>فاکتورها</h2>
            </div>
          </div>
          {loading ? (
            <p className="records-muted" role="status">
              در حال دریافت فاکتورها…
            </p>
          ) : invoices.length === 0 ? (
            <div className="records-empty">هنوز فاکتوری ثبت نشده است.</div>
          ) : (
            <ul className="finance-invoice-list">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <div className="finance-invoice-head">
                    <div>
                      <strong>{invoice.patientName}</strong>
                      <span>{formatMoment(invoice.createdAt)}</span>
                    </div>
                    <span
                      className={`records-status ${invoice.status !== "PAID" ? "is-open" : ""}`}
                    >
                      {invoice.status === "PAID"
                        ? "تسویه‌شده"
                        : invoice.status === "PARTIAL"
                          ? "پرداخت مرحله‌ای"
                          : "باز"}
                    </span>
                  </div>
                  <ul className="finance-line-list">
                    {invoice.lines.map((line) => (
                      <li key={line.id}>
                        <span>
                          {line.description} × {line.quantity}
                        </span>
                        <b>{formatRial(line.lineTotalRial)}</b>
                      </li>
                    ))}
                  </ul>
                  <div className="finance-total-line">
                    <span>کل فاکتور</span>
                    <strong>{formatRial(invoice.totalRial)}</strong>
                  </div>
                  <div className="finance-total-line">
                    <span>مانده</span>
                    <strong>{formatRial(invoice.balanceRial)}</strong>
                  </div>
                  {invoice.status !== "PAID" ? (
                    payingInvoiceId === invoice.id ? (
                      <form
                        className="finance-payment-form"
                        noValidate
                        onSubmit={(event) => void createPayment(event, invoice.id)}
                      >
                        <TextField
                          id={`payment-amount-${invoice.id}`}
                          label="مبلغ پرداخت به ریال"
                          name="amountRial"
                          inputMode="numeric"
                          defaultValue={invoice.balanceRial}
                        />
                        <label htmlFor={`payment-method-${invoice.id}`}>روش پرداخت</label>
                        <select
                          id={`payment-method-${invoice.id}`}
                          name="paymentMethod"
                          defaultValue="CASH"
                        >
                          <option value="CASH">نقدی</option>
                          <option value="CARD">کارت</option>
                          <option value="TRANSFER">انتقال بانکی</option>
                          <option value="ONLINE">آنلاین</option>
                          <option value="OTHER">سایر</option>
                        </select>
                        <button
                          className="button button-primary"
                          type="submit"
                          disabled={busy}
                          aria-busy={busy}
                        >
                          ثبت پرداخت
                        </button>
                        <button
                          className="button button-outline"
                          type="button"
                          onClick={() => setPayingInvoiceId(null)}
                        >
                          انصراف
                        </button>
                      </form>
                    ) : (
                      <button
                        className="button button-outline finance-action"
                        type="button"
                        disabled={!canManageFinance}
                        onClick={() => setPayingInvoiceId(invoice.id)}
                      >
                        ثبت پرداخت
                      </button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="records-side-column">
          <section className="content-card records-card" aria-labelledby="expense-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">پرداخت خروجی</span>
                <h2 id="expense-title">ثبت هزینه</h2>
              </div>
            </div>
            <form className="finance-form" noValidate onSubmit={createExpense}>
              <TextField
                id="expense-description"
                label="شرح هزینه"
                name="description"
                maxLength={240}
                placeholder="مثلاً خرید اقلام مصرفی"
              />
              <TextField
                id="expense-amount"
                label="مبلغ (ریال)"
                name="amountRial"
                inputMode="numeric"
                placeholder="مبلغ به ریال"
              />
              <label htmlFor="expense-method">روش پرداخت</label>
              <select id="expense-method" name="paymentMethod" defaultValue="CASH">
                <option value="CASH">نقدی</option>
                <option value="CARD">کارت</option>
                <option value="TRANSFER">انتقال بانکی</option>
                <option value="ONLINE">آنلاین</option>
                <option value="OTHER">سایر</option>
              </select>
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || !canManageFinance}
                aria-busy={busy}
              >
                ثبت هزینه
              </button>
            </form>
          </section>
          <section className="content-card records-card" aria-labelledby="ledger-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">ردپای مالی</span>
                <h2 id="ledger-title">آخرین تراکنش‌ها</h2>
              </div>
            </div>
            {entries.length === 0 ? (
              <div className="records-empty">تراکنشی ثبت نشده است.</div>
            ) : (
              <ul className="finance-ledger-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>
                        {entry.kind === "PAYMENT"
                          ? "دریافت"
                          : entry.kind === "REFUND"
                            ? "برگشت پرداخت"
                            : "هزینه"}
                      </strong>
                      <span>{entry.patient?.fullName ?? entry.memo ?? "کلینیک"}</span>
                      <time dateTime={entry.createdAt}>{formatMoment(entry.createdAt)}</time>
                    </div>
                    <b className={entry.direction === "INCOME" ? "is-income" : "is-outgoing"}>
                      {entry.direction === "INCOME" ? "+" : "−"}
                      {formatRial(entry.amountRial)}
                    </b>
                    {entry.kind === "PAYMENT" && entry.reverseCount === 0 && canManageFinance ? (
                      refundTarget === entry.id ? (
                        <div className="finance-refund-confirm" role="group">
                          <span>برگشت کامل این پرداخت انجام شود؟</span>
                          <button
                            type="button"
                            className="button-danger-outline"
                            disabled={busy}
                            onClick={() => void refundPayment(entry.id)}
                          >
                            ثبت برگشت
                          </button>
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => setRefundTarget(null)}
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <button
                          className="records-revoke-button"
                          type="button"
                          disabled={busy}
                          onClick={() => setRefundTarget(entry.id)}
                        >
                          برگشت کامل
                        </button>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
