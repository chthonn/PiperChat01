import React, { Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import Login from "./components/login/Login";

const Register  = React.lazy(() => import("./components/register/Register"));
const Dashboard = React.lazy(() => import("./components/dashboard/Dashboard"));
const Auth      = React.lazy(() => import("./components/auth/Auth"));
const Invite    = React.lazy(() => import("./components/invite/Invite"));
const NotFound  = React.lazy(() => import("./components/notFound/NotFound"));

import NotificationListener from "./components/notifications/NotificationListener";

function Splash() {
  return (
    <div
      className="flex items-center justify-center h-screen bg-gray-900"
      role="status"
      aria-label="Loading PiperChat"
    >
      <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-4 px-4">
          <span className="text-5xl" aria-hidden="true">⚠️</span>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            An unexpected error occurred. Reloading usually fixes this.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            Reload PiperChat
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-2 text-xs text-red-400 bg-gray-800 rounded-lg p-3 max-w-sm overflow-auto">
              {this.state.errorMessage}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}


function PublicRoute({ children, redirectTo = "/channels/@me" }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to={redirectTo} replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.14, ease: "easeIn" } },
};

function PageMotion({ pageKey, children }) {
  return (
    <motion.div
      key={pageKey}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Suspense fallback={<Splash />}>
          <Routes location={location}>

            <Route
              path="/"
              element={
                <PublicRoute>
                  <PageMotion pageKey="login">
                    <Login />
                  </PageMotion>
                </PublicRoute>
              }
            />

            <Route
              path="/register"
              element={
                <PublicRoute>
                  <PageMotion pageKey="register">
                    <Register />
                  </PageMotion>
                </PublicRoute>
              }
            />

            <Route element={<Auth />}>
              <Route
                path="/channels/:server_id"
                element={
                  <PageMotion pageKey="dashboard">
                    <Dashboard />
                  </PageMotion>
                }
              />
              
              <Route
                path="/invite/:invite_link"
                element={
                  <PageMotion pageKey="invite">
                    <Invite />
                  </PageMotion>
                }
              />
            </Route>
      
            <Route
              path="*"
              element={
                <PageMotion pageKey="not-found">
                  <NotFound />
                </PageMotion>
              }
            />

          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Analytics />
        <AnimatedRoutes />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
