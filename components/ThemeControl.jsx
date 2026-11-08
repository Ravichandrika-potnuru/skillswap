"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function applyTheme(mode, systemDark) {
  const theme = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = theme;
}

export default function ThemeControl() {
  const [mode, setMode] = useState("system");
  const detailsRef = useRef(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    const saved = localStorage.getItem("skillswap-theme") || "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    // The persisted preference is read once after hydration to keep server markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(saved);
    modeRef.current = saved;
    applyTheme(saved, media.matches);
    const sync = () => { if (modeRef.current === "system") applyTheme("system", media.matches); };
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  function choose(value) {
    localStorage.setItem("skillswap-theme", value);
    modeRef.current = value;
    setMode(value);
    applyTheme(value, window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const SelectedIcon = options.find((option) => option.value === mode)?.Icon || Monitor;
  return <details className="theme-control" ref={detailsRef}>
    <summary aria-label={`Appearance: ${mode}`} title={`Appearance: ${mode}`}><SelectedIcon size={18}/></summary>
    <div className="theme-popover" role="group" aria-label="Color theme">
      <span className="eyebrow">APPEARANCE</span>
      {options.map(({ value, label, Icon }) => <button key={value} type="button" role="radio" aria-checked={mode === value} className={mode === value ? "selected" : ""} onClick={() => choose(value)}><Icon size={16}/><span>{label}</span>{mode === value && <b aria-hidden="true">✓</b>}</button>)}
    </div>
  </details>;
}
