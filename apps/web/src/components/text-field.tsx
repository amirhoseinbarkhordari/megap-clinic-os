"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  ltr?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ id, label, hint, error, ltr = false, required, ...inputProps }, ref) => {
    const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
      <label className="field" htmlFor={id}>
        <span className="field-label">
          {label}
          {required ? (
            <span className="required-mark" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
        <input
          {...inputProps}
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          dir={ltr ? "ltr" : undefined}
        />
        {error ? (
          <small className="field-error" id={descriptionId}>
            {error}
          </small>
        ) : hint ? (
          <small className="field-hint" id={descriptionId}>
            {hint}
          </small>
        ) : null}
      </label>
    );
  },
);
TextField.displayName = "TextField";

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, "type" | "ltr">>(
  function PasswordField({ id, label, error, hint, required, ...inputProps }, ref) {
    const [visible, setVisible] = useState(false);
    const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
      <label className="field" htmlFor={id}>
        <span className="field-label">
          {label}
          {required ? (
            <span className="required-mark" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
        <span className="password-input-wrap">
          <input
            {...inputProps}
            ref={ref}
            id={id}
            required={required}
            type={visible ? "text" : "password"}
            autoComplete={inputProps.autoComplete ?? "current-password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={descriptionId}
          />
          <button
            className="password-visibility"
            type="button"
            aria-label={visible ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "پنهان" : "نمایش"}
          </button>
        </span>
        {error ? (
          <small className="field-error" id={descriptionId}>
            {error}
          </small>
        ) : hint ? (
          <small className="field-hint" id={descriptionId}>
            {hint}
          </small>
        ) : null}
      </label>
    );
  },
);
