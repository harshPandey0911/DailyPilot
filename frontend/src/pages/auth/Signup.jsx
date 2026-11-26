import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField } from "../../components/forms/TextField.jsx";
import {
  AtIcon, BackIcon, CalendarIcon, HourglassIcon, MailIcon, PhoneIcon, RulerIcon, ScaleIcon, UserIcon,
} from "../../components/forms/Icons.jsx";
import SocialAuth from "../../components/auth/SocialAuth.jsx";
import { getHeightHelperUrl, signup } from "../../services/authService.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function ageFromDob(dob) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = "Enter your full name";
  if (!USERNAME_RE.test(v.username) || /^\.|\.$/.test(v.username)) e.username = "3–30 characters: letters, numbers, . or _";
  if (!PHONE_RE.test(v.phone.trim())) e.phone = "Enter a valid mobile number";
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address";

  if (v.dob) {
    const a = ageFromDob(v.dob);
    if (a === null || new Date(v.dob) > new Date()) e.age = "Enter a valid date of birth";
    else if (a < 5 || a > 120) e.age = "Age must be between 5 and 120";
  } else if (v.age === "") {
    e.age = "Enter your age or date of birth";
  } else if (!Number.isInteger(Number(v.age)) || Number(v.age) < 5 || Number(v.age) > 120) {
    e.age = "Age must be between 5 and 120";
  }

  const weight = Number(v.weight);
  if (v.weight === "" || !(weight >= 20 && weight <= 300)) e.weight = "Enter your weight in kg (20–300)";
  const height = Number(v.height);
  if (v.height === "" || !(height >= 50 && height <= 250)) e.height = "Enter your height in cm (50–250)";
  if (!v.gender) e.gender = "Select your gender";
  return e;
}

export default function Signup() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ageMode, setAgeMode] = useState("age"); // "age" | "dob"
  const [heightUrl, setHeightUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    getHeightHelperUrl().then((url) => alive && setHeightUrl(url));
    return () => { alive = false; };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    v.gender = v.gender ?? "";
    v.age = v.age ?? "";
    v.dob = v.dob ?? "";
    const found = validate(v);
    setErrors(found);
    setFormError("");
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      const el = formRef.current.elements[firstBad === "age" ? ageMode : firstBad];
      return (el.focus ? el : el[0]).focus();
    }

    setLoading(true);
    try {
      await signup({
        name: v.name.trim(),
        username: v.username,
        phone: v.phone.trim(),
        email: v.email.trim() || undefined,
        age: v.dob ? ageFromDob(v.dob) : Number(v.age),
        dob: v.dob || undefined,
        weightKg: Number(v.weight),
        heightCm: Number(v.height),
        gender: v.gender,
      });
      navigate("/home");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Link className="btn btn--ghost btn--icon auth__back" to="/login" aria-label="Back to login"><BackIcon /></Link>
      <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate>
        <div>
          <h1 className="auth-form__title">Create Your Account</h1>
          <p className="text-secondary">Start your productivity journey with DailyPilot.</p>
        </div>

        {formError && <div className="alert alert--danger" role="alert"><p className="alert__title">{formError}</p></div>}

        <TextField id="name" label="Full name" icon={<UserIcon />} autoComplete="name" placeholder="Jane Doe" error={errors.name} />
        <TextField
          id="username" label="Username" icon={<AtIcon />} autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder="jane.doe"
          onInput={(e) => { e.target.value = e.target.value.toLowerCase().replace(/\s/g, ""); }}
          error={errors.username}
        />
        <TextField id="phone" label="Mobile number" icon={<PhoneIcon />} type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" error={errors.phone} />
        <TextField id="email" label="Email address (optional)" icon={<MailIcon />} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" error={errors.email} />

        <fieldset className="field-group">
          <legend className="field__label">Age or date of birth</legend>
          <div className="choice-group" role="radiogroup">
            {[["age", "Age"], ["dob", "Date of birth"]].map(([value, label]) => (
              <label key={value} className="choice">
                <input type="radio" name="ageMode" value={value} checked={ageMode === value} onChange={() => { setAgeMode(value); setErrors((er) => ({ ...er, age: undefined })); }} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {ageMode === "age" ? (
            <TextField key="age" id="age" label="Age" icon={<HourglassIcon />} type="number" inputMode="numeric" min="5" max="120" placeholder="25" error={errors.age} />
          ) : (
            <TextField key="dob" id="dob" label="Date of birth" icon={<CalendarIcon />} type="date" max={todayISO()} error={errors.age} />
          )}
        </fieldset>

        <TextField id="weight" label="Weight" icon={<ScaleIcon />} type="number" inputMode="decimal" min="20" max="300" step="0.1" placeholder="65" suffix="kg" error={errors.weight} />

        <div className="field">
          <TextField id="height" label="Height" icon={<RulerIcon />} type="number" inputMode="decimal" min="50" max="250" step="0.1" placeholder="170" suffix="cm" error={errors.height} />
          <p className="field__hint">
            Don&apos;t know your height?{" "}
            {heightUrl ? (
              <a className="auth-form__link" href={heightUrl} target="_blank" rel="noopener noreferrer">Recommended app</a>
            ) : (
              <span className="auth-form__link">Recommended app</span>
            )}
          </p>
        </div>

        <fieldset className="field-group">
          <legend className="field__label">Gender</legend>
          <div className="choice-group">
            {GENDERS.map((g) => (
              <label key={g.value} className="choice">
                <input type="radio" name="gender" value={g.value} aria-invalid={errors.gender ? "true" : undefined} />
                <span>{g.label}</span>
              </label>
            ))}
          </div>
          {errors.gender && <span className="field__error" role="alert">{errors.gender}</span>}
        </fieldset>

        <button className={`btn btn--secondary btn--lg btn--block ${loading ? "is-loading" : ""}`} type="submit" disabled={loading}>
          Create account
        </button>

        <SocialAuth />

        <p className="auth-form__switch">
          Already have an account?
          <Link className="auth-form__link" to="/login">Login</Link>
        </p>
      </form>
    </>
  );
}
