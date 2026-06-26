import React, { useEffect, useState } from "react";

export default function Toast({ text, variant = "info", lightMode = false }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (text) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [text]);
  
  if (!text) return null;
  
  const classesBase = "rounded-full text-[10px] sm:text-[11px] px-3 py-1.5 shadow-lg backdrop-blur-md border font-medium transition-all duration-300 ease-out transform max-w-[90vw] ";
  let tone = "";
  if (variant === "success") {
    tone = lightMode 
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-emerald-200/30" 
      : "border-emerald-500/60 bg-emerald-500/20 text-emerald-200 shadow-emerald-500/30";
  } else if (variant === "warning") {
    tone = lightMode 
      ? "border-gold-400 bg-gold-400/15 text-gold-600 shadow-gold-400/20" 
      : "border-gold-400/60 bg-gold-400/20 text-gold-400 shadow-gold-400/20";
  } else {
    tone = lightMode 
      ? "border-brand-300 bg-brand-50 text-brand-700 shadow-brand-300/20" 
      : "border-brand-500/60 bg-brand-500/20 text-brand-100 shadow-brand-500/30";
  }
  
  const classes = classesBase + tone;
  const animationClass = isVisible 
    ? "translate-y-0 opacity-100 scale-100" 
    : "-translate-y-4 opacity-0 scale-95";

  return (
    <div className="fixed top-1 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className={`${classes} ${animationClass} pointer-events-none will-change-transform`}>
        {variant === "success" && <span className="mr-1">✨</span>}
        {variant === "warning" && <span className="mr-1">⚠️</span>}
        {text}
      </div>
    </div>
  );
}


