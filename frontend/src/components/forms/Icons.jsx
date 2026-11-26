const base = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
};

export const MailIcon = () => (<svg {...base}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>);
export const LockIcon = () => (<svg {...base}><rect x="5" y="11" width="14" height="9" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
export const UserIcon = () => (<svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg>);
export const PhoneIcon = () => (<svg {...base}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>);
export const EyeIcon = () => (<svg {...base}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const EyeOffIcon = () => (<svg {...base}><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>);
export const BackIcon = () => (<svg {...base} width="22" height="22"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const ArrowRightIcon = () => (<svg {...base} width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const AtIcon = () => (<svg {...base}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></svg>);
export const CalendarIcon = () => (<svg {...base}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>);
export const HourglassIcon = () => (<svg {...base}><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></svg>);
export const ScaleIcon = () => (<svg {...base}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2" /></svg>);
export const RulerIcon = () => (<svg {...base}><rect x="3" y="8" width="18" height="8" rx="2" /><path d="M7 8v3M11 8v4M15 8v3M19 8v2" /></svg>);
