import React from "react";

export default function Toast({ text, variant = "info", lightMode = false }) {
  if (!text) return null;
  const classesBase = "rounded-md text-xs px-3 py-2 shadow-lg backdrop-blur border ";
  let tone = "";
  if (variant === "success") {
    tone = lightMode ? "border-green-300 bg-green-100 text-green-800" : "border-green-500/40 bg-green-500/15 text-green-200";
  } else if (variant === "warning") {
    tone = lightMode ? "border-yellow-300 bg-yellow-100 text-yellow-900" : "border-yellow-500/40 bg-yellow-500/15 text-yellow-200";
  } else {
    tone = lightMode ? "border-sky-300 bg-sky-100 text-sky-900" : "border-sky-500/40 bg-sky-500/15 text-sky-200";
  }
  const classes = classesBase + tone;

  return (
    <div className="fixed top-2 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className={classes}>{text}</div>
    </div>
  );
}


