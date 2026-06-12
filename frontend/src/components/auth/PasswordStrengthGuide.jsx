const PASSWORD_MIN_LENGTH = 8;

const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

function getPasswordStrength(password) {
  const metCount = PASSWORD_REQUIREMENTS.filter((rule) => rule.test(password)).length;

  if (!password) {
    return {
      label: "Start typing",
      color: "rgba(255,255,255,0.35)",
      width: "0%",
    };
  }

  if (metCount <= 1) {
    return { label: "Weak", color: "#f87171", width: "25%" };
  }

  if (metCount === 2) {
    return { label: "Fair", color: "#fbbf24", width: "50%" };
  }

  if (metCount === 3) {
    return { label: "Good", color: "#4ade80", width: "75%" };
  }

  return { label: "Strong", color: "#22c55e", width: "100%" };
}

export default function PasswordStrengthGuide({ password }) {
  const strength = getPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-white/3 p-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Password strength</span>
          <span style={{ color: strength.color }}>{strength.label}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: strength.width,
              background:
                "linear-gradient(90deg, #ef4444 0%, #f59e0b 33%, #a855f7 66%, #22c55e 100%)",
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const passed = rule.test(password);

          return (
            <div
              key={rule.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium"
              style={{
                background: passed ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                border: passed ? "1px solid rgba(34,197,94,0.24)" : "1px solid rgba(255,255,255,0.08)",
                color: passed ? "#86efac" : "rgba(255,255,255,0.52)",
              }}
            >
              <span className="text-xs">{passed ? "✓" : "•"}</span>
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PASSWORD_MIN_LENGTH };
