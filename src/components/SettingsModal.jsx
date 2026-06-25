import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { saveLightModePreference } from "../lib/theme.js";

function useIsDesktop() {
  const query = "(min-width: 768px)";
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

const DEFAULTS = {
  hardMode: false,
  easyMode: false,
  lightMode: true,
  soundsEnabled: true,
  hideTimerWhileSolving: false,
  showAllClues: false,
};

function readSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}");
    return {
      hardMode: s.hardMode === true,
      easyMode: s.easyMode === true,
      lightMode: s.lightMode !== false,
      soundsEnabled: s.soundsEnabled !== false,
      hideTimerWhileSolving: s.hideTimerWhileSolving === true,
      showAllClues: s.showAllClues === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function Toggle({ checked, onChange, label, light }) {
  return (
    <button
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        checked ? "bg-brand-600" : light ? "bg-parchment-300" : "bg-navyink-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsModal({ onClose, onLightModeChange }) {
  const [settings, setSettings] = useState(readSettings);
  const light = settings.lightMode;
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const update = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("stepwords-settings", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleLight = () => {
    const checked = !settings.lightMode;
    update({ lightMode: checked });
    saveLightModePreference(checked);
    try {
      document.dispatchEvent(new CustomEvent("stepwords-settings-updated", { detail: { lightMode: checked } }));
    } catch {}
    onLightModeChange?.(checked);
  };

  const rows = [
    { key: "hardMode", label: "Hard mode", desc: "Hides step locations (🪜) until revealed." },
    { key: "easyMode", label: "Easy mode", desc: "Filters the keyboard to letters in this puzzle." },
    { key: "lightMode", label: "Light mode", desc: "Invert colors for a light appearance.", onToggle: toggleLight },
    { key: "soundsEnabled", label: "Sounds", desc: "Step, correct, and celebration sounds." },
    { key: "hideTimerWhileSolving", label: "Hide timer while solving", desc: "Time is still recorded and counts toward stats." },
    // "Show all clues" is a desktop-only layout option
    ...(isDesktop
      ? [{ key: "showAllClues", label: "Show all clues", desc: "Show every clue at once instead of one at a time (desktop)." }]
      : []),
  ];

  const panel = light ? "border-parchment-200 bg-parchment-50 text-navyink-900" : "border-navyink-700 bg-navyink-850 text-parchment-50";
  const muted = light ? "text-navyink-700/65" : "text-parchment-200/55";
  const label = light ? "text-navyink-800" : "text-parchment-100";
  const divider = light ? "border-parchment-200" : "border-navyink-700";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navyink-900/60 px-4 py-6 backdrop-blur-sm">
      <div className={`my-auto w-full max-w-md sm:max-w-xl rounded-3xl border p-6 shadow-2xl animate-fade-in-up ${panel}`}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-serif text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className={`-mr-1 grid h-9 w-9 place-items-center rounded-full transition-colors ${light ? "text-navyink-700 hover:bg-parchment-100" : "text-parchment-200 hover:bg-navyink-700"}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className={`mb-4 text-sm ${muted}`}>Choose your defaults — these apply to every puzzle you open.</p>

        <div className="space-y-1">
          {rows.map((row, i) => (
            <div key={row.key}>
              {i === 3 && <div className={`my-2 border-t ${divider}`} />}
              <div className="flex items-center justify-between gap-4 py-1.5">
                <span className={`font-medium ${label}`}>{row.label}</span>
                <Toggle
                  light={light}
                  label={row.label}
                  checked={settings[row.key]}
                  onChange={row.onToggle || (() => update({ [row.key]: !settings[row.key] }))}
                />
              </div>
              <p className={`pb-1 text-xs ${muted}`}>{row.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${light ? "bg-brand-700 hover:bg-brand-800" : "bg-brand-600 hover:bg-brand-500"}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
