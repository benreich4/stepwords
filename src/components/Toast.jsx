import React from "react";

export default function Toast({ text, variant = "info" }) {
  if (!text) return null;
  const classes =
    "rounded-md text-xs px-3 py-2 shadow-lg backdrop-blur border " +
    (variant === "success"
      ? "border-green-500/40 bg-green-500/15 text-green-200"
      : variant === "warning"
      ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-200"
      : "border-sky-500/40 bg-sky-500/15 text-sky-200");

  return (
    <div className="fixed top-2 left-0 right-0 z-40 flex justify-center px-3">
      <div className={classes}>{text}</div>
    </div>
  );
}


