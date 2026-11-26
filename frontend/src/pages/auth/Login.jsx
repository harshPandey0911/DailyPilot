import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField, TextField } from "../../components/forms/TextField.jsx";
import { LockIcon, UserIcon } from "../../components/forms/Icons.jsx";
import SocialAuth from "../../components/auth/SocialAuth.jsx";
import { login } from "../../services/authService.js";


function validate({ identifier, password }) {
  const errors = {};
  if (identifier.trim().length < 3) errors.identifier = "Enter your username, email or mobile number";
  if (!password) errors.password = "Enter your password";
  return errors;
}

export default function Login() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const found = validate(values);
    setErrors(found);
    setFormError("");
    const firstBad = Object.keys(found)[0];
    if (firstBad) return formRef.current.elements[firstBad]?.focus();

    setLoading(true);
    try {
      await login({ identifier: values.identifier.trim(), password: values.password });
      navigate("/home");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate>
      <div>
        <h1 className="auth-form__title">Welcome Back <span aria-hidden="true">👋</span></h1>
        <p className="text-secondary">Log in to continue your journey.</p>
      </div>

      {formError && <div className="alert alert--danger" role="alert"><p className="alert__title">{formError}</p></div>}

      <TextField id="identifier" label="Username, email or mobile" icon={<UserIcon />} autoComplete="off" autoCapitalize="none" placeholder="Username, email or mobile" error={errors.identifier} />
      <PasswordField id="password" label="Password" icon={<LockIcon />} autoComplete="new-password" placeholder="Your password" error={errors.password} />

      <Link className="auth-form__forgot" to="/forgot-password">Forgot Password?</Link>

      <button className={`btn btn--secondary btn--lg btn--block ${loading ? "is-loading" : ""}`} type="submit" disabled={loading}>
        Login
      </button>

      <SocialAuth />

      <p className="auth-form__switch">
        Don&apos;t have an account?
        <Link className="auth-form__link" to="/signup">Sign Up</Link>
      </p>
    </form>
  );
}
