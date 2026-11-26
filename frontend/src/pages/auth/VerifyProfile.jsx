import { lazy, Suspense, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import logo from "../../assets/DailyPilot Logo.png";
import { AtIcon, CalendarIcon, HourglassIcon, MailIcon, PhoneIcon, RulerIcon, ScaleIcon, UserIcon } from "../../components/forms/Icons.jsx";
import { clearDraft, loadDraft } from "../../services/profileDraft.js";
import { signup } from "../../services/authService.js";

// three.js is large — load it only when this page is opened.
const Avatar3D = lazy(() => import("../../components/avatar/Avatar3D.jsx"));

const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" };

function ageFromDob(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age;
}

const formatDob = (dob) => new Date(dob).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export default function VerifyProfile() {
  const navigate = useNavigate();
  const [draft] = useState(loadDraft);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!draft) return <Navigate to="/signup" replace />;

  const age = draft.dob ? ageFromDob(draft.dob) : Number(draft.age);
  const heightCm = Number(draft.height);
  const weightKg = Number(draft.weight);

  const rows = [
    { icon: <UserIcon />, label: "Full name", value: draft.name },
    { icon: <AtIcon />, label: "Username", value: `@${draft.username}` },
    { icon: <PhoneIcon />, label: "Mobile number", value: draft.phone },
    { icon: <MailIcon />, label: "Email", value: draft.email || "Not provided" },
    { icon: <HourglassIcon />, label: "Age", value: `${age} years` },
    ...(draft.dob ? [{ icon: <CalendarIcon />, label: "Date of birth", value: formatDob(draft.dob) }] : []),
    { icon: <ScaleIcon />, label: "Weight", value: `${weightKg} kg` },
    { icon: <RulerIcon />, label: "Height", value: `${heightCm} cm` },
    { icon: <UserIcon />, label: "Gender", value: GENDER_LABEL[draft.gender] ?? draft.gender },
  ];

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      await signup({
        name: draft.name.trim(),
        username: draft.username,
        phone: draft.phone.trim(),
        email: draft.email.trim() || undefined,
        age,
        dob: draft.dob || undefined,
        weightKg,
        heightCm,
        gender: draft.gender,
      });
      clearDraft();
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="verify">
      <header className="verify__header">
        <img className="verify__logo" src={logo} alt="DailyPilot" draggable="false" />
      </header>

      <div className="verify__grid">
        <section className="verify__stage" aria-label="Your avatar">
          <Suspense fallback={<div className="verify__loading"><span className="spinner" role="status" aria-label="Loading avatar" /></div>}>
            <Avatar3D gender={draft.gender} heightCm={heightCm} weightKg={weightKg} />
          </Suspense>
          <p className="verify__hint">Drag to rotate</p>
        </section>

        <section className="verify__details" aria-labelledby="verify-title">
          <div>
            <h1 id="verify-title">Verify your details</h1>
            <p className="text-secondary">Here&apos;s your profile. Make sure everything looks right before we create your account.</p>
          </div>

          <dl className="detail-list">
            {rows.map((r, i) => (
              <div key={r.label} className="detail-row" style={{ "--i": i }}>
                <span className="detail-row__icon">{r.icon}</span>
                <dt className="detail-row__label">{r.label}</dt>
                <dd className="detail-row__value">{r.value}</dd>
              </div>
            ))}
          </dl>

          {error && <div className="alert alert--danger" role="alert"><p className="alert__title">{error}</p></div>}

          <div className="verify__actions">
            <Link className="btn btn--outline btn--lg" to="/signup">Edit details</Link>
            <button type="button" className={`btn btn--secondary btn--lg ${loading ? "is-loading" : ""}`} onClick={confirm} disabled={loading}>
              Confirm &amp; create account
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
