"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
  const [open, setOpen] = useState(false);
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const modeRef = useRef(mode);
  const popoverId = useId();
  const reduceMotion = useReducedMotion() === true;

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

  useEffect(() => {
    function closeOutside(event) {
      if (!controlRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(value) {
    localStorage.setItem("skillswap-theme", value);
    modeRef.current = value;
    setMode(value);
    applyTheme(value, window.matchMedia("(prefers-color-scheme: dark)").matches);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const SelectedIcon = options.find((option) => option.value === mode)?.Icon || Monitor;
  return <div className="theme-control" ref={controlRef}>
    <button ref={triggerRef} className="theme-control-trigger" type="button" aria-label={`Appearance: ${mode}`} title={`Appearance: ${mode}`} aria-haspopup="true" aria-expanded={open} aria-controls={open ? popoverId : undefined} onClick={() => setOpen((value) => !value)}><SelectedIcon size={18}/></button>
    <AnimatePresence initial={false}>
      {open && <motion.div id={popoverId} className="theme-popover" role="group" aria-label="Color theme" initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }} transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: [0.16, 1, 0.3, 1] }}>
        <span className="eyebrow">APPEARANCE</span>
        {options.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={mode === value} className={mode === value ? "selected" : ""} onClick={() => choose(value)}><Icon size={16}/><span>{label}</span>{mode === value && <b aria-hidden="true">✓</b>}</button>)}
      </motion.div>}
    </AnimatePresence>
  </div>;
}
