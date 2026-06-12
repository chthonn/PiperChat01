import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AuthShell from "../auth/AuthShell";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { API_BASE_URL } from "../../config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";


function Label({ children }) {
  return (
    <label
      className="block text-[11px] font-bold tracking-widest uppercase mb-1.5"
      style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em" }}
    >
      {children}
    </label>
  );
}

function StyledInput({ ...props }) {
  return (
    <input
      {...props}
      className="w-full h-10 rounded-xl px-4 text-sm font-medium outline-none transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#f0f0f5",
        caretColor: "#a855f7",
        ...(props.style || {}),
      }}
      onFocus={(e) => {
        e.target.style.border = "1px solid rgba(168,85,247,0.5)";
        e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.12)";
        e.target.style.background = "rgba(255,255,255,0.07)";
        if (props.onFocus) props.onFocus(e);
      }}
      onBlur={(e) => {
        e.target.style.border = "1px solid rgba(255,255,255,0.1)";
        e.target.style.boxShadow = "none";
        e.target.style.background = "rgba(255,255,255,0.05)";
        if (props.onBlur) props.onBlur(e);
      }}
    />
  );
}

function StyledSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className="h-10 w-full rounded-xl px-3 text-sm font-medium outline-none transition-all duration-200 cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: props.value === "" ? "rgba(255,255,255,0.3)" : "#f0f0f5",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "32px",
      }}
      onFocus={(e) => {
        e.target.style.border = "1px solid rgba(168,85,247,0.5)";
        e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.12)";
        e.target.style.background = "rgba(255,255,255,0.07)";
      }}
      onBlur={(e) => {
        e.target.style.border = "1px solid rgba(255,255,255,0.1)";
        e.target.style.boxShadow = "none";
        e.target.style.background = "rgba(255,255,255,0.05)";
      }}
    >
      {children}
    </select>
  );
}

function PrimaryButton({ children, disabled, ...props }) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.015 } : {}}
      whileTap={!disabled ? { scale: 0.985 } : {}}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      className="w-full h-11 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
      style={{
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
        color: disabled ? "rgba(255,255,255,0.25)" : "#fff",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : "0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
        letterSpacing: "0.04em",
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function GhostButton({ children, disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className="h-9 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.background = "rgba(255,255,255,0.06)";
          e.target.style.color = "rgba(255,255,255,0.8)";
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "transparent";
        e.target.style.color = "rgba(255,255,255,0.5)";
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function AlertBanner({ message, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "#fca5a5",
        }}
      >
        <div className="flex items-center gap-2">
          <span>⚠</span>
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-1.5 py-0.5 hover:bg-white/10 transition-colors text-xs"
          style={{ color: "rgba(252,165,165,0.6)" }}
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function Register() {
  const Navigate = useNavigate();
  const [days, setdays] = useState([]);
  const [year, setyear] = useState([]);
  const [otp_value, setotp_value] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const [alert_box, setalert_box] = useState(false);
  const [alert_message, setalert_message] = useState("");
  const [otp_alert_box, setotp_alert_box] = useState(false);
  const [otp_alert_message, setotp_alert_message] = useState("");
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [date_validation, setdate_validation] = useState(false);
  const [password_validation, setpassword_validation] = useState(false);
  const [user_values, setuser_values] = useState({
    date_value: "",
    year_value: "",
    month_value: "",
    username: "",
    password: "",
    confirm_password: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const url = API_BASE_URL;

  const canSubmit = useMemo(
    () =>
      user_values.email.trim().length > 0 &&
      user_values.username.trim().length > 0 &&
      user_values.password.length > 0 &&
      user_values.confirm_password.length > 0 &&
      user_values.date_value !== "" &&
      user_values.month_value !== "" &&
      user_values.year_value !== "",
    [user_values]
  );

  const handle_user_values = (e) => {
    const { name } = e.target;
    if ((name === "password" || name === "confirm_password") && password_validation) {
      setpassword_validation(false);
    }
    setuser_values((v) => ({ ...v, [e.target.name]: e.target.value }));
  };

  const handle_otp = (e) => setotp_value(e.target.value);

  useEffect(() => {
    const min_date = new Date().getFullYear();
    const years = [];
    for (let i = min_date - 18; i > min_date - 118; i--) years.push(i);
    setyear(years);
    const daysList = [];
    for (let i = 1; i < 32; i++) daysList.push(i);
    setdays(daysList);
  }, []);



  const register_req = async (e) => {
    e.preventDefault();
    var dob = `${user_values.month_value} ${user_values.date_value} , ${user_values.year_value}`;
    const d = new Date(dob);
    let day = d.getDate();

    if (!url) {
      setalert_message("Missing VITE_URL. Check frontend/.env.");
      setalert_box(true);
      return;
    }

    if (Number(user_values.date_value) !== day) {
      setdate_validation(true);
    } else if (user_values.password !== user_values.confirm_password) {
      setpassword_validation(true);
    } else {
      setdate_validation(false);
      setpassword_validation(false);
      const { email, password, username } = user_values;
      try {
        setSubmitting(true);
        setalert_box(false);
        const res = await fetch(`${url}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username, dob }),
        });
        const data = await res.json();
        if (data.status === 201) {
          const emailSent = data.email_sent !== false;
          setVerificationEmailSent(emailSent);
          if (!emailSent) {
            setotp_alert_message(
              "We couldn't send the verification email. Click Resend."
            );
            setotp_alert_box(true);
          }

          setModalShow(true);
        } else if (data.status === 202) {
          setalert_message("An account with this email already exists.");
          setalert_box(true);
        } else if (data.status === 204) {
          setalert_message("Please fill in all fields.");
          setalert_box(true);
        } else if (data.status === 400) {
          setalert_message("Password must be at least 7 characters long.");
          setalert_box(true);
        } else {
          setalert_message("Registration failed. Please try again.");
          setalert_box(true);
        }
      } catch {
        setalert_message("Network error. Please try again.");
        setalert_box(true);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const verify_req = async (e) => {
    e.preventDefault();
    if (!url) return;
    try {
      setVerifying(true);
      setotp_alert_box(false);
      const res = await fetch(`${url}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp_value: otp_value.trim(), email: user_values.email }),
      });
      const data = await res.json();
      if (data.status === 201) {
        setModalShow(false);
        setotp_value("");
        setModalShow(false);
        setotp_value("");
        Navigate("/");
      } else if (data.status === 432) {
        setotp_alert_message("Incorrect code. Please try again.");
        setotp_alert_box(true);
      } else if (data.status === 442) {
        setotp_alert_message(
          "Code expired. A new one has been sent to your email."
        );
        setotp_alert_box(true);
      } else {
        setotp_alert_message("Verification failed. Please try again.");
        setotp_alert_box(true);
      }
    } catch {
      setotp_alert_message("Network error. Please try again.");
      setotp_alert_box(true);
    } finally {
      setVerifying(false);
    }
  };

  const resend_otp = async () => {
    if (!url) return;
    try {
      setVerifying(true);
      const res = await fetch(`${url}/auth/resend_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user_values.email }),
      });
      const data = await res.json();
      if (data.status === 201) {
        setVerificationEmailSent(data.email_sent !== false);
        setotp_alert_message(
          data.email_sent === false
            ? "Couldn't send email. Please try again."
            : "New code sent! Check your inbox."
        );
      } else {
        setotp_alert_message("Could not resend code. Please try again.");
      }
      setotp_alert_box(true);
    } catch {
      setotp_alert_message("Network error. Please try again.");
      setotp_alert_box(true);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <AuthShell mode="register">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3.5"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div>
              <h1
                className="text-[1.7rem] font-black tracking-tight leading-none"
                style={{ color: "#f0f0f5" }}
              >
                Create your account
              </h1>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Join PiperChat in under a minute
              </p>
            </div>
          </div>

          {/* Alert */}
          {alert_box && (
            <AlertBanner message={alert_message} onClose={() => setalert_box(false)} />
          )}

          {/* Form */}
          <form onSubmit={register_req} className="space-y-3" noValidate>
            <div>
              <Label>Email</Label>
              <StyledInput
                name="email"
                type="email"
                autoComplete="email"
                value={user_values.email}
                onChange={handle_user_values}
                required
                disabled={submitting || verifying}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label>Username</Label>
              <StyledInput
                name="username"
                value={user_values.username}
                onChange={handle_user_values}
                required
                disabled={submitting || verifying}
                placeholder="sunil"
              />
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <StyledInput
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={user_values.password}
                  onChange={handle_user_values}
                  required
                  disabled={submitting || verifying}
                  placeholder="At least 7 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ cursor: "pointer" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FiEyeOff size={14} style={{ color: "var(--text-secondary)" }} />
                  ) : (
                    <FiEye size={14} style={{ color: "var(--text-secondary)" }} />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Minimum 7 characters.
              </p>
            </div>

            <div>
              <Label>Confirm Password</Label>
              <div className="space-y-1.5">
                <StyledInput
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={user_values.confirm_password}
                  onChange={handle_user_values}
                  required
                  disabled={submitting || verifying}
                  placeholder="Confirm your password"
                />
                <AnimatePresence>
                  {password_validation && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl px-3 py-1 text-[10px] leading-tight"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        color: "#ff6b6b",
                      }}
                    >
                      Confirm password entered is wrong
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Date of Birth */}
            <div
              className="rounded-2xl p-3"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Label>Date of Birth</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <StyledSelect
                  name="date_value"
                  value={user_values.date_value}
                  onChange={handle_user_values}
                  disabled={submitting || verifying}
                  required
                >
                  <option value="" disabled>Day</option>
                  {days.map((d) => (
                    <option key={`day-${d}`} value={d} style={{ background: "#1a1a2e", color: "#f0f0f5" }}>
                      {d}
                    </option>
                  ))}
                </StyledSelect>

                <StyledSelect
                  name="month_value"
                  value={user_values.month_value}
                  onChange={handle_user_values}
                  disabled={submitting || verifying}
                  required
                >
                  <option value="" disabled>Month</option>
                  {months.map((m, idx) => (
                    <option key={`month-${idx + 1}`} value={idx + 1} style={{ background: "#1a1a2e", color: "#f0f0f5" }}>
                      {m}
                    </option>
                  ))}
                </StyledSelect>

                <StyledSelect
                  name="year_value"
                  value={user_values.year_value}
                  onChange={handle_user_values}
                  disabled={submitting || verifying}
                  required
                >
                  <option value="" disabled>Year</option>
                  {year.map((y) => (
                    <option key={`year-${y}`} value={y} style={{ background: "#1a1a2e", color: "#f0f0f5" }}>
                      {y}
                    </option>
                  ))}
                </StyledSelect>
              </div>

              {date_validation && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 rounded-xl px-3 py-1.5 text-[11px]"
                  style={{
                    background: "rgba(234,179,8,0.08)",
                    border: "1px solid rgba(234,179,8,0.2)",
                    color: "#fde68a",
                  }}
                >
                  Please enter a valid date of birth.
                </motion.div>
              )}
            </div>

            <div className="pt-1">
              <PrimaryButton
                type="submit"
                disabled={!canSubmit || submitting || verifying}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : (
                  "Continue →"
                )}
              </PrimaryButton>
            </div>
          </form>

          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Already have an account?{" "}
            <RouterLink
              to="/"
              className="font-bold transition-colors"
              style={{ color: "#c084fc" }}
              onMouseEnter={(e) => (e.target.style.color = "#e879f9")}
              onMouseLeave={(e) => (e.target.style.color = "#c084fc")}
            >
              Log in
            </RouterLink>
          </p>
        </motion.div>
      </AuthShell>

      {/* ── Verification modal ── */}
      <Dialog
        open={modalShow}
        onOpenChange={(open) => {
          if (verifying) return;
          setModalShow(open);
          if (!open) {
            setotp_value("");
            setotp_alert_box(false);
            setotp_alert_message("");
            setVerificationEmailSent(false);
          }
        }}
      >
        <DialogContent
          style={{
            background: "#111118",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.15)",
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.2)",
              }}
            >
              📧
            </div>
          </div>

          <DialogTitle
            className="text-center text-xl font-black tracking-tight"
            style={{ color: "#f0f0f5" }}
          >
            Check your inbox
          </DialogTitle>
          <DialogDescription
            className="text-center text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {verificationEmailSent ? (
              <>
                We sent a verification code to{" "}
                <span className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {user_values.email}
                </span>
              </>
            ) : (
              <>
                We couldn't send the verification email yet. Click Resend to try
                again.
              </>
            )}
          </DialogDescription>
          {otp_alert_box && (
            <div className="mt-4">
              <AlertBanner
                message={otp_alert_message}
                onClose={() => setotp_alert_box(false)}
              />
            </div>
          )}
          <form onSubmit={verify_req} className="mt-5 space-y-4">
            <div>
              <Label>Verification Code</Label>
              <StyledInput
                value={otp_value}
                onChange={handle_otp}
                inputMode="numeric"
                autoFocus
                disabled={verifying || !verificationEmailSent}
                placeholder="Enter code"
                style={{ textAlign: "center", letterSpacing: "0.3em", fontSize: "1.1rem" }}
              />
            </div>

            <DialogFooter className="flex gap-2 pt-1">
              <GhostButton
                type="button"
                onClick={() => {
                  if (verifying) return;
                  setModalShow(false);
                  setotp_value("");
                }}
                disabled={verifying}
              >
                Cancel
              </GhostButton>

              <GhostButton
                type="button"
                onClick={resend_otp}
                disabled={verifying}
              >
                Resend
              </GhostButton>

              <PrimaryButton
                type="submit"
                disabled={otp_value.trim() === "" || verifying || !verificationEmailSent}
                style={{ flex: 1 }}
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  "Verify →"
                )}
              </PrimaryButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Register;
