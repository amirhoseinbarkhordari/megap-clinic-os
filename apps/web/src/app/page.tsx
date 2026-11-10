const foundations = [
  { label: "ساختار فنی", detail: "پروژه‌ی وب و API آماده‌ی توسعه است.", state: "آماده" },
  {
    label: "پایگاه داده",
    detail: "پس از راه‌اندازی PostgreSQL پیکربندی می‌شود.",
    state: "در انتظار",
  },
  { label: "ورود امن", detail: "در فاز هویت و دسترسی پیاده‌سازی می‌شود.", state: "در انتظار" },
];

export default function HomePage() {
  const today = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date());

  return (
    <main className="workspace">
      <aside className="rail" aria-label="ناوبری اصلی">
        <a className="brand" href="#main" aria-label="MEGAP، صفحه‌ی اصلی">
          <span className="brand-mark" aria-hidden="true">
            م
          </span>
          <span className="brand-copy">
            <strong>MEGAP</strong>
            <small>کلینیک OS</small>
          </span>
        </a>
        <div className="rail-divider" />
        <nav className="primary-nav">
          <a href="#main" className="nav-item is-active" aria-current="page">
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span>نمای کلی</span>
          </a>
          <span
            className="nav-item is-disabled"
            aria-disabled="true"
            title="در فازهای بعدی فعال می‌شود"
          >
            <span className="nav-icon" aria-hidden="true">
              ▦
            </span>
            <span>نوبت‌ها</span>
            <small>بعداً</small>
          </span>
          <span
            className="nav-item is-disabled"
            aria-disabled="true"
            title="در فازهای بعدی فعال می‌شود"
          >
            <span className="nav-icon" aria-hidden="true">
              ◉
            </span>
            <span>مراجعان</span>
            <small>بعداً</small>
          </span>
          <span
            className="nav-item is-disabled"
            aria-disabled="true"
            title="در فازهای بعدی فعال می‌شود"
          >
            <span className="nav-icon" aria-hidden="true">
              ♙
            </span>
            <span>پرسنل</span>
            <small>بعداً</small>
          </span>
        </nav>
        <div className="rail-bottom">
          <span className="avatar" aria-hidden="true">
            م
          </span>
          <span className="profile-copy">
            <strong>فضای کاری شما</strong>
            <small>راه‌اندازی اولیه</small>
          </span>
          <span className="profile-dot" aria-label="وضعیت راه‌اندازی"></span>
        </div>
      </aside>

      <section className="main-column" id="main">
        <header className="topbar">
          <div className="crumb">
            <span className="crumb-root">MEGAP</span>
            <span aria-hidden="true">/</span>
            <span>نمای کلی</span>
          </div>
          <div className="topbar-meta">
            <span className="environment">
              <i aria-hidden="true"></i>محیط توسعه
            </span>
            <span className="date-label">{today}</span>
          </div>
        </header>

        <div className="content">
          <section className="welcome" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <span className="eyebrow">
                <span className="eyebrow-line"></span>فضای کاری کلینیک
              </span>
              <h1 id="welcome-title">
                پایه‌ی کار آماده است<span className="period">.</span>
              </h1>
              <p>
                MEGAP را گام‌به‌گام برای مدیریت روزمره‌ی کلینیک آماده می‌کنیم. اطلاعات واقعی کلینیک
                پس از تکمیل ورود امن و پایگاه داده نمایش داده می‌شود.
              </p>
            </div>
            <div className="welcome-seal" aria-hidden="true">
              <span>م</span>
              <i></i>
            </div>
          </section>

          <section className="progress-panel" aria-labelledby="progress-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">آمادگی سامانه</span>
                <h2 id="progress-title">پیش‌نیازهای شروع</h2>
              </div>
              <span className="progress-count">
                <b>۱</b>
                <span>از ۳ مورد آماده</span>
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="پیشرفت راه‌اندازی"
              aria-valuenow={33}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span></span>
            </div>
            <ul className="foundation-list">
              {foundations.map((item, index) => (
                <li className="foundation-row" key={item.label}>
                  <span
                    className={`step-marker ${index === 0 ? "complete" : "pending"}`}
                    aria-hidden="true"
                  >
                    {index === 0 ? "✓" : `۰${index + 1}`}
                  </span>
                  <div className="foundation-copy">
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className={`status ${index === 0 ? "status-ready" : "status-pending"}`}>
                    <i aria-hidden="true"></i>
                    {item.state}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="page-footer">
            <span>MEGAP Clinic OS</span>
            <span>
              نسخه‌ی پایه <b>۰.۱</b>
            </span>
            <span>تاریخ‌ها بر پایه‌ی تقویم شمسی</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
