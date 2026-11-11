"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { TextField } from "../../../components/text-field";
import { networkErrorMessage } from "../../../lib/api-error";
import { useAuth } from "../../../lib/auth-context";

type Branch = { id: string; name: string };
type Product = {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  reorderPoint: number;
  branches: Array<{
    branchId: string;
    branchName: string;
    quantityOnHand: number;
    lowStock: boolean;
  }>;
};
type Movement = {
  id: string;
  kind: "OPENING" | "PURCHASE" | "CONSUMPTION" | "ADJUSTMENT";
  quantityDelta: number;
  unitCostRial: string | null;
  note: string | null;
  createdAt: string;
  product: { name: string; sku: string | null; unit: string };
  branch: { name: string };
  createdBy: { user: { displayName: string } };
};

function operationKey(keys: Map<string, string>, scope: string, payload: unknown) {
  const fingerprint = `${scope}:${JSON.stringify(payload)}`;
  let key = keys.get(fingerprint);
  if (!key) {
    key = crypto.randomUUID();
    keys.set(fingerprint, key);
  }
  return { fingerprint, key };
}

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function digits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
}

export default function InventoryPage() {
  const { status, profile, request } = useAuth();
  const canManageInventory = profile?.permissions.includes("inventory.manage") ?? false;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idempotencyKeys] = useState(() => new Map<string, string>());

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setLoadError(null);
    try {
      const [branchRows, productRows, movementRows] = await Promise.all([
        request<Branch[]>("/inventory/branches"),
        request<Product[]>("/inventory/products?limit=200"),
        request<Movement[]>("/inventory/movements?limit=50"),
      ]);
      setBranches(branchRows);
      setProducts(productRows);
      setMovements(movementRows);
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

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const sku = String(values.get("sku") ?? "").trim();
    const unit = String(values.get("unit") ?? "").trim();
    const reorderPoint = Number(digits(String(values.get("reorderPoint") ?? "0")) || 0);
    if (
      name.length < 2 ||
      name.length > 160 ||
      unit.length < 1 ||
      !Number.isInteger(reorderPoint) ||
      reorderPoint < 0
    ) {
      setFormError("نام کالا، واحد و حداقل موجودی معتبر را وارد کنید.");
      return;
    }
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = {
        name,
        sku: sku || undefined,
        category: String(values.get("category") ?? "").trim() || undefined,
        unit,
        reorderPoint,
      };
      await request("/inventory/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      setNotice("کالا به فهرست انبار اضافه شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const branchId = String(values.get("branchId") ?? "");
    const productId = String(values.get("productId") ?? "");
    const kind = String(values.get("kind") ?? "PURCHASE") as
      | "PURCHASE"
      | "CONSUMPTION"
      | "ADJUSTMENT";
    const quantity = Number(digits(String(values.get("quantity") ?? "")));
    const direction = String(values.get("direction") ?? "ADD");
    const unitCostRial = digits(String(values.get("unitCostRial") ?? ""));
    if (
      !branchId ||
      !productId ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 2_000_000_000
    ) {
      setFormError("شعبه، کالا و تعداد معتبر را انتخاب کنید.");
      return;
    }
    if (kind === "PURCHASE" && direction !== "ADD") {
      setFormError("ورود خرید باید تعداد موجودی را افزایش دهد.");
      return;
    }
    const quantityDelta =
      kind === "CONSUMPTION" || (kind === "ADJUSTMENT" && direction === "REMOVE")
        ? -quantity
        : quantity;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const payload = {
        branchId,
        productId,
        kind,
        quantityDelta,
        unitCostRial: kind === "PURCHASE" && unitCostRial ? unitCostRial : undefined,
      };
      const operation = operationKey(idempotencyKeys, "inventory-movement", payload);
      await request("/inventory/movements", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: operation.key }),
      });
      idempotencyKeys.delete(operation.fingerprint);
      form.reset();
      setNotice("گردش موجودی ثبت شد.");
      await load();
    } catch (error) {
      setFormError(networkErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="records-page inventory-page" dir="rtl">
      <div className="records-topline">
        <Link href="/workspace">بازگشت به فضای کلینیک</Link>
        <nav aria-label="ماژول‌ها">
          <Link href="/workspace/finance">مالی</Link>
          <Link aria-current="page" href="/workspace/inventory">
            انبار
          </Link>
        </nav>
      </div>
      <header className="records-heading">
        <div>
          <span className="auth-index">موجودی شعبه‌ای · گردش تغییرناپذیر</span>
          <h1>مدیریت انبار</h1>
          <p>ورود، مصرف و اصلاح موجودی همراه با ردپای مسئول و شعبه</p>
        </div>
        <span className="records-confidential">موجودی منفی مجاز نیست</span>
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

      <div className="inventory-grid">
        <div className="inventory-main-column">
          <section className="content-card records-card" aria-labelledby="stock-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">موجودی به تفکیک شعبه</span>
                <h2 id="stock-title">کالاها</h2>
              </div>
            </div>
            {loading ? (
              <p className="records-muted" role="status">
                در حال دریافت موجودی…
              </p>
            ) : products.length === 0 ? (
              <div className="records-empty">هنوز کالایی ثبت نشده است.</div>
            ) : (
              <ul className="inventory-product-list">
                {products.map((product) => (
                  <li key={product.id}>
                    <div className="inventory-product-head">
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {product.sku ? `شناسه ${product.sku} · ` : ""}
                          {product.category ?? "بدون دسته"} · واحد: {product.unit}
                        </span>
                      </div>
                      <small>
                        هشدار زیر {new Intl.NumberFormat("fa-IR").format(product.reorderPoint)}{" "}
                        {product.unit}
                      </small>
                    </div>
                    {product.branches.length ? (
                      <ul className="inventory-branch-list">
                        {product.branches.map((branch) => (
                          <li key={branch.branchId}>
                            <span>{branch.branchName}</span>
                            <strong>
                              {new Intl.NumberFormat("fa-IR").format(branch.quantityOnHand)}{" "}
                              {product.unit}
                            </strong>
                            {branch.lowStock ? (
                              <em>نیاز به تأمین</em>
                            ) : (
                              <span className="records-status is-open">موجود</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="records-muted">برای شعبه‌ای موجودی ثبت نشده است.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="content-card records-card" aria-labelledby="movement-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">سوابق ورود و مصرف</span>
                <h2 id="movement-title">گردش‌های اخیر</h2>
              </div>
            </div>
            {movements.length === 0 ? (
              <div className="records-empty">گردشی ثبت نشده است.</div>
            ) : (
              <ul className="inventory-movement-list">
                {movements.map((movement) => (
                  <li key={movement.id}>
                    <div>
                      <strong>{movement.product.name}</strong>
                      <span>
                        {movement.branch.name} · {movement.createdBy.user.displayName}
                      </span>
                      <time dateTime={movement.createdAt}>{formatMoment(movement.createdAt)}</time>
                    </div>
                    <b className={movement.quantityDelta > 0 ? "is-income" : "is-outgoing"}>
                      {movement.quantityDelta > 0 ? "+" : "−"}
                      {new Intl.NumberFormat("fa-IR").format(Math.abs(movement.quantityDelta))}{" "}
                      {movement.product.unit}
                    </b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="records-side-column">
          <section className="content-card records-card" aria-labelledby="product-create-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">تعریف قلم</span>
                <h2 id="product-create-title">افزودن کالا</h2>
              </div>
            </div>
            <form className="finance-form" noValidate onSubmit={createProduct}>
              <TextField
                id="product-name"
                label="نام کالا"
                name="name"
                maxLength={160}
                placeholder="نام محصول یا اقلام مصرفی"
              />
              <TextField
                id="product-sku"
                label="شناسه / کد کالا"
                name="sku"
                maxLength={80}
                placeholder="اختیاری"
              />
              <TextField
                id="product-category"
                label="دسته"
                name="category"
                maxLength={120}
                placeholder="مثلاً مراقبت پوست"
              />
              <TextField
                id="product-unit"
                label="واحد شمارش"
                name="unit"
                maxLength={24}
                defaultValue="عدد"
              />
              <TextField
                id="product-reorder"
                label="حداقل موجودی هشدار"
                name="reorderPoint"
                inputMode="numeric"
                defaultValue="۰"
              />
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || !canManageInventory}
                aria-busy={busy}
              >
                افزودن کالا
              </button>
            </form>
          </section>
          <section className="content-card records-card" aria-labelledby="movement-create-title">
            <div className="records-section-heading">
              <div>
                <span className="auth-index">ورود، مصرف یا اصلاح</span>
                <h2 id="movement-create-title">ثبت گردش موجودی</h2>
              </div>
            </div>
            {branches.length === 0 ? (
              <div className="records-empty">
                برای ثبت موجودی، ابتدا در کلینیک یک شعبه فعال بسازید.
              </div>
            ) : products.length === 0 ? (
              <div className="records-empty">ابتدا یک کالا ثبت کنید.</div>
            ) : (
              <form className="finance-form" noValidate onSubmit={createMovement}>
                <label htmlFor="movement-branch">شعبه</label>
                <select id="movement-branch" name="branchId" defaultValue="">
                  <option value="">انتخاب شعبه</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="movement-product">کالا</label>
                <select id="movement-product" name="productId" defaultValue="">
                  <option value="">انتخاب کالا</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="movement-kind">نوع گردش</label>
                <select id="movement-kind" name="kind" defaultValue="PURCHASE">
                  <option value="PURCHASE">ورود / خرید</option>
                  <option value="CONSUMPTION">مصرف</option>
                  <option value="ADJUSTMENT">اصلاح شمارش</option>
                </select>
                <TextField
                  id="movement-quantity"
                  label="تعداد"
                  name="quantity"
                  inputMode="numeric"
                  placeholder="تعداد صحیح"
                />
                <label htmlFor="movement-direction">جهت اصلاح</label>
                <select id="movement-direction" name="direction" defaultValue="ADD">
                  <option value="ADD">افزایش موجودی</option>
                  <option value="REMOVE">کاهش موجودی</option>
                </select>
                <TextField
                  id="movement-unit-cost"
                  label="بهای هر واحد (ریال)"
                  name="unitCostRial"
                  inputMode="numeric"
                  placeholder="اختیاری، برای خرید"
                />
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy || !canManageInventory}
                  aria-busy={busy}
                >
                  ثبت گردش
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
