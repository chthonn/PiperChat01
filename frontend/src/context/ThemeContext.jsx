import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const themes = {
  forestDark: "#3f5a46",
  peach: "#e7b79d",
  pastelBlue: "#aeb8d6",
  pastelGreen: "#d9dec2",

  redDark: "#250000",
  purpleDark: "#120a2c",
  brownDark: "#6d4037",
  greyBlue: "#66708f",
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "purpleDark"
  );

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--bg-primary",
      themes[theme]
    );

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);