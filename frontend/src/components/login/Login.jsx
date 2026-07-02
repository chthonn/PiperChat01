 import { useMemo, useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../auth/AuthShell";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { API_BASE_URL } from "../../config";


function Label({ children }) {
  return (
    <label
      className="block text-xs font-bold tracking-widest uppercase mb-2"
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
      className="w-full h-11 rounded-xl px-4 text-sm font-medium outline-none transition-all duration-200"
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

function PrimaryButton({ children, disabled, ...props }) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.015 } : {}}
      whileTap={!disabled ? { scale: 0.985 } : {}}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      className="w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
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

function AlertBanner({ message, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "#fca5a5",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "0.9em" }}>⚠</span>
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs rounded-lg px-1.5 py-0.5 hover:bg-white/10 transition-colors"
          style={{ color: "rgba(252,165,165,0.6)" }}
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function Login() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/channels/@me', { replace: true });
    }
  }, [navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [user_values, setuser_values] = useState({ email: "", password: "" });
  const [alert_box, setalert_box] = useState(false);
  const [alert_message, setalert_message] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const url = API_BASE_URL;

  const canSubmit = useMemo(
    () => user_values.email.trim().length > 0 && user_values.password.length > 0,
    [user_values.email, user_values.password]
  );

  const handle_user_values = (e) => {
    setuser_values((v) => ({ ...v, [e.target.name]: e.target.value }));
  };

  const login_req = async (e) => {
    e.preventDefault();
    const { email, password } = user_values;
    if (!url) {
      setalert_message("Missing VITE_URL. Check frontend/.env.");
      setalert_box(true);
      return;
    }
    try {
      setSubmitting(true);
      setalert_box(false);
      const res = await fetch(`${url}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.status === 442) {
        setalert_message("Invalid email or password.");
        setalert_box(true);
      } else if (data.status === 201) {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("piperchat:auth-token"));
        const redirectTo = location.state?.from?.pathname || "/channels/@me";
        navigate(redirectTo, { replace: true });
      } else if (data.status === 422) {
        setalert_message("Account not verified yet.");
        setalert_box(true);
      } else {
        setalert_message("Login failed. Please try again.");
        setalert_box(true);
      }
    } catch {
      setalert_message("Network error. Please try again.");
      setalert_box(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode="login">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          
          <div>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ color: "#f0f0f5" }}
            >
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sign in to continue to PiperChat
            </p>
          </div>
        </div>

        {alert_box && (
          <AlertBanner message={alert_message} onClose={() => setalert_box(false)} />
        )}

        <form onSubmit={login_req} className="space-y-4" noValidate>
          <div>
            <Label>Email</Label>
            <StyledInput
              name="email"
              type="email"
              autoComplete="email"
              value={user_values.email}
              onChange={handle_user_values}
              required
              disabled={submitting}
              placeholder="you@example.com"
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Label>Password</Label>
            </div>            
            <StyledInput
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={user_values.password}
              onChange={handle_user_values}
              required
              disabled={submitting}
              placeholder="••••••••"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[70%] -translate-y-1/2"
                style={{cursor : 'pointer'}}
              >
                {showPassword ? ( <FiEyeOff size={14} style={{ color: "var(--text-secondary)" }} />) : (
                  <FiEye size={14} style={{ color: "var(--text-secondary)" }} />)}
              </button>
          </div>

          <div className="pt-1">
            <PrimaryButton type="submit" disabled={!canSubmit || submitting}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in →"
              )}
            </PrimaryButton>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            or
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          New to PiperChat?{" "}
          <RouterLink
            to="/register"
            className="font-bold transition-colors"
            style={{ color: "#c084fc" }}
            onMouseEnter={(e) => (e.target.style.color = "#e879f9")}
            onMouseLeave={(e) => (e.target.style.color = "#c084fc")}
          >
            Create an account
          </RouterLink>
        </p>
      </motion.div>
    </AuthShell>
  );
}

export default Login;