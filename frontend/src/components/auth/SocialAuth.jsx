// "or continue with" row. Buttons are UI-only until OAuth is wired on the backend.
const providers = [
  {
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8Z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6-4.5H2.4v2.800A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M6 14.100a6.600 6.600 0 0 1 0-4.200V7.100H2.400a11 11 0 0 0 0 9.800L6 14.100Z" />
        <path fill="#EA4335" d="M12 5.400c1.600 0 3 .6 4.200 1.600l3.100-3.100A11 11 0 0 0 2.400 7.100L6 9.900c.8-2.600 3.200-4.500 6-4.500Z" />
      </svg>
    ),
  },
  {
    name: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M16.400 12.600c0-2.400 2-3.500 2.100-3.600-1.100-1.700-2.900-1.900-3.500-1.900-1.500-.2-2.900.9-3.700.9s-1.900-.9-3.200-.8c-1.600 0-3.100 1-4 2.400-1.700 3-.4 7.400 1.200 9.800.8 1.200 1.800 2.500 3 2.400 1.200 0 1.700-.8 3.100-.8s1.900.8 3.200.8 2.100-1.200 2.900-2.400c.9-1.300 1.300-2.600 1.300-2.700 0 0-2.400-.9-2.400-3.600ZM14 5.500c.7-.8 1.100-1.900 1-3-1 0-2.100.7-2.800 1.500-.6.700-1.100 1.800-1 2.900 1.100.1 2.100-.6 2.800-1.400Z" />
      </svg>
    ),
  },
  {
    name: "Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#F25022" d="M3 3h8.500v8.500H3z" />
        <path fill="#7FBA00" d="M12.500 3H21v8.500h-8.500z" />
        <path fill="#00A4EF" d="M3 12.500h8.500V21H3z" />
        <path fill="#FFB900" d="M12.500 12.500H21V21h-8.500z" />
      </svg>
    ),
  },
];

export default function SocialAuth() {
  return (
    <>
      <div className="auth-divider" role="separator"><span>or continue with</span></div>
      <div className="auth-social">
        {providers.map(({ name, icon }) => (
          <button key={name} type="button" className="btn btn--outline" aria-label={`Continue with ${name}`}>
            {icon}
          </button>
        ))}
      </div>
    </>
  );
}
