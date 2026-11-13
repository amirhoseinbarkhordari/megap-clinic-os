# اجرای محلی با Docker / Run locally with Docker

> Status: files written but **not executed** by the author (no Docker daemon/network in the authoring sandbox). If a build step fails, send the error output.
> فقط برای نمایش محلی با داده‌های ساختگی؛ برای داده واقعی بیمار یا پرداخت استفاده نکنید.

## اجرا (ساده‌ترین راه)
```bash
./start-local.sh          # ساخت و اجرا و انتظار تا آماده شدن
./start-local.sh logs     # لاگ‌ها
./start-local.sh down     # توقف
./start-local.sh reset    # حذف همه داده‌ها و شروع تازه (با تأیید)
```

## اجرا (دستی)
```bash
docker compose up --build
```
بار اول چند دقیقه طول می‌کشد (نصب وابستگی‌ها و build).

- وب: http://localhost:3000  (ثبت‌نام کلینیک در `/register`)
- API Swagger: http://localhost:4000/api/docs
- حتماً با آدرس `localhost` باز کنید (نه `127.0.0.1`)؛ CORS و کوکی روی آن تنظیم شده است.

## چه اتفاقی می‌افتد
1. PostgreSQL 16 بالا می‌آید و نقش‌های `megap_admin` و `megap_app` ساخته می‌شود.
2. API مایگریشن‌ها را با نقش admin اجرا می‌کند (`prisma migrate deploy`) و سپس شروع می‌شود.
3. اگر `JWT_ACCESS_SECRET` و `MEGAP_PHI_ENCRYPTION_KEYS` تنظیم نشده باشند، یک‌بار تولید و در volume به نام `api_secrets` نگه‌داری می‌شوند (کلید رمزنگاری یادداشت‌های پزشکی؛ پاک‌کردن این volume یعنی یادداشت‌های قبلی خوانا نخواهند بود).

## تنظیمات اختیاری (فایل `.env` کنار docker-compose.yml)
`NODE_IMAGE`, `NPM_REGISTRY` (برای mirror داخلی)، `POSTGRES_ADMIN_PASSWORD`, `MEGAP_APP_PASSWORD`. اگر پسورد دیتابیس را بعد از اولین اجرا عوض کنید، باید volume دیتابیس پاک شود.

## توقف / پاک‌سازی
```bash
docker compose down        # توقف، داده‌ها می‌مانند
docker compose down -v     # توقف و حذف همه داده‌ها (مخرب)
```

## نکات
- `COOKIE_SECURE=false` فقط برای HTTP محلی است؛ در تولید باید HTTPS و `true` باشد.
- `NEXT_PUBLIC_API_URL` هنگام build داخل باندل وب قرار می‌گیرد؛ برای تغییر آدرس API باید `docker compose build web` دوباره اجرا شود.
