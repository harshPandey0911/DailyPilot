import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import logo from "../../assets/DailyPilot Logo.png";

const SEEN_KEY = "dp_splash_seen";
const SPLASH_MS = 1900; // logo build (~1.1s) + short hold, then dock + sheet slide-up

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Shared shell for /login and /signup.
 * First visit per session: logo builds in the centre → moves to the top →
 * the form sheet slides up from the bottom. Later visits skip straight to docked.
 */
export default function AuthLayout() {
  const [skipIntro] = useState(() => sessionStorage.getItem(SEEN_KEY) === "1" || prefersReducedMotion());
  const [docked, setDocked] = useState(skipIntro);

  useEffect(() => {
    if (docked) return undefined;
    const t = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, "1");
      setDocked(true);
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [docked]);

  return (
    <div className={`auth ${docked ? "is-docked" : "is-intro"} ${skipIntro ? "is-skip" : ""}`}>
      <span className="auth__blob auth__blob--tr" aria-hidden="true" />
      <span className="auth__blob auth__blob--bl" aria-hidden="true" />
      <div className="auth__logo">
        <img className="auth__logo-img" src={logo} alt="DailyPilot" draggable="false" />
      </div>
      <main className="auth__content" id="main">
        <Outlet />
      </main>
    </div>
  );
}
