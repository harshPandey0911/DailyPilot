import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import logo from "../../assets/DailyPilot Logo.png";
import { AtIcon, CalendarIcon, HourglassIcon, MailIcon, PhoneIcon, RulerIcon, ScaleIcon, TargetIcon, UserIcon } from "../../components/forms/Icons.jsx";
import { clearDraft, loadDraft } from "../../services/profileDraft.js";
import { signup } from "../../services/authService.js";
import { generateRealisticPortrait, getPortraitStatus } from "../../services/avatarService.js";

// three.js is large — load it only when this page is opened.
const Avatar3D = lazy(() => import("../../components/avatar/Avatar3D.jsx"));

const AREA_LABEL = { fitness: "Fitness", study: "Study", goals: "Daily Goals" };
const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" };
const POSES = [
  { id: "relaxed", label: "Relaxed" },
  { id: "athletic", label: "Athletic" },
  { id: "crossed", label: "Crossed" },
  { id: "wave", label: "Wave" },
];

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
  const captureRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [viewMode, setViewMode] = useState("3d"); // "3d" | "photo"
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [portraitEnabled, setPortraitEnabled] = useState(false);
  const [pose, setPose] = useState("relaxed");

  useEffect(() => {
    const ac = new AbortController();
    getPortraitStatus({ signal: ac.signal }).then((s) => setPortraitEnabled(Boolean(s?.portraitEnabled)));
    return () => ac.abort();
  }, []);

  if (!draft) return <Navigate to="/signup" replace />;

  const age = draft.dob ? ageFromDob(draft.dob) : Number(draft.age);
  const heightCm = Number(draft.height);
  const weightKg = Number(draft.weight);

  const rows = [
    { icon: <UserIcon />, label: "Full name", value: draft.name },
    { icon: <AtIcon />, label: "Username", value: `@${draft.username}` },
    { icon: <PhoneIcon />, label: "Mobile number", value: draft.phone },
    { icon: <MailIcon />, label: "Email", value: draft.email || "Not provided" },
    { icon: <TargetIcon />, label: "Focus", value: AREA_LABEL[draft.area] ?? "Fitness" },
    { icon: <HourglassIcon />, label: "Age", value: `${age} years` },
    ...(draft.dob ? [{ icon: <CalendarIcon />, label: "Date of birth", value: formatDob(draft.dob) }] : []),
    { icon: <ScaleIcon />, label: "Weight", value: `${weightKg} kg` },
    { icon: <RulerIcon />, label: "Height", value: `${heightCm} cm` },
    { icon: <UserIcon />, label: "Gender", value: GENDER_LABEL[draft.gender] ?? draft.gender },
  ];

  async function generatePhoto() {
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const snapshotBase64 = captureRef.current?.() || undefined;
      const data = await generateRealisticPortrait({
        gender: draft.gender,
        age,
        heightCm,
        weightKg,
        snapshotBase64,
      });
      setPhotoUrl(data.imageDataUrl);
      setViewMode("photo");
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoLoading(false);
    }
  }

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
        focusArea: draft.area || "fitness",
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
          <div className="verify__media">
            <div className={`verify__canvas ${viewMode === "photo" && photoUrl ? "is-hidden" : ""}`}>
              <Suspense fallback={<div className="verify__loading"><span className="spinner" role="status" aria-label="Loading avatar" /></div>}>
                <Avatar3D gender={draft.gender} heightCm={heightCm} weightKg={weightKg} pose={pose} captureRef={captureRef} />
              </Suspense>
            </div>
            {viewMode === "photo" && photoUrl && (
              <img className="verify__photo" src={photoUrl} alt="Photorealistic studio portrait preview" />
            )}
          </div>
          {!(viewMode === "photo" && photoUrl) && (
            <div className="verify__poses" role="group" aria-label="Avatar posture">
              {POSES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`verify__pose ${pose === p.id ? "is-active" : ""}`}
                  aria-pressed={pose === p.id}
                  onClick={() => setPose(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="verify__stage-bar">
            <p className="verify__hint">{viewMode === "photo" && photoUrl ? "AI studio portrait" : "Drag to rotate"}</p>
            {portraitEnabled && (
              <div className="verify__stage-actions">
                {photoUrl && (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setViewMode((m) => (m === "photo" ? "3d" : "photo"))}
                    disabled={photoLoading}
                  >
                    {viewMode === "photo" ? "Show 3D view" : "Show real photo"}
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn--primary btn--sm ${photoLoading ? "is-loading" : ""}`}
                  onClick={generatePhoto}
                  disabled={photoLoading}
                >
                  {photoUrl ? "Regenerate photo" : "Generate real photo"}
                </button>
              </div>
            )}
          </div>
          {photoError && (
            <div className="alert alert--danger verify__stage-error" role="alert">
              <p className="alert__title">{photoError}</p>
            </div>
          )}
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
