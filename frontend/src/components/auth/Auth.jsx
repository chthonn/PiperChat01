import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "../loading/Loading";

const Auth = () => {
  const location = useLocation();
  const [auth_check, setauth_check] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const url = import.meta.env.VITE_URL;

  const private_routes = useCallback(async () => {
    if (!url || !token) {
      setauth_check(false);
      return;
    }

    try {
      const res = await fetch(`${url}/verify_route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      });
      const data = await res.json();
      if (data.status === 201) {
        setauth_check(true);
      } else {
        localStorage.removeItem("token");
        setToken(null);
        setauth_check(false);
      }
    } catch {
      setauth_check(false);
    }
  }, [token, url]);

  useEffect(() => {
    const handleTokenChange = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", handleTokenChange);
    window.addEventListener("piperchat:auth-token", handleTokenChange);
    return () => {
      window.removeEventListener("storage", handleTokenChange);
      window.removeEventListener("piperchat:auth-token", handleTokenChange);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setauth_check(false);
      return;
    }
    setauth_check(null);
    private_routes();
  }, [private_routes, token]);

  return (
    <>
      {auth_check === true ? (
        <Outlet />
      ) : auth_check === false ? (
        <Navigate to="/" replace state={{ from: location }} />
      ) : (
        <Loading />
      )}
    </>
  );
};

export default Auth;
