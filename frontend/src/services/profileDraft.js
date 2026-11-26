// Signup details held in sessionStorage between the form and the verification page.
const KEY = "dp_profile_draft";

export function saveDraft(draft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(KEY);
}
