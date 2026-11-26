import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "./Icons.jsx";

/** Labelled input with a leading icon and an accessible error message. */
export function TextField({ id, label, icon, error, hint, suffix, children, ...inputProps }) {
  const errId = `${id}-error`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <span className="input-wrap__icon">{icon}</span>
        <input
          id={id}
          name={id}
          className="input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errId : undefined}
          {...inputProps}
        />
        {suffix && <span className="input-wrap__suffix">{suffix}</span>}
        {children}
      </div>
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span id={errId} className="field__error" role="alert">{error}</span>}
    </div>
  );
}

/** TextField with a show/hide toggle. */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField {...props} type={visible ? "text" : "password"}>
      <button
        type="button"
        className="btn btn--ghost btn--icon input-wrap__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </TextField>
  );
}
