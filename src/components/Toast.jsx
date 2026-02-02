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
  
  const classesBase = "rounded-lg text-xs sm:text-sm px-4 py-2.5 shadow-2xl backdrop-blur-md border font-medium transition-all duration-300 ease-out transform ";
  let tone = "";
  if (variant === "success") {
    tone = lightMode 
      ? "border-green-300 bg-green-50 text-green-800 shadow-green-200/30" 
      : "border-green-500/60 bg-green-500/20 text-green-200 shadow-green-500/30";
  } else if (variant === "warning") {
    tone = lightMode 
      ? "border-yellow-300 bg-yellow-50 text-yellow-900 shadow-yellow-200/30" 
      : "border-yellow-500/60 bg-yellow-500/20 text-yellow-200 shadow-yellow-500/30";
  } else {
    tone = lightMode 
      ? "border-sky-300 bg-sky-50 text-sky-900 shadow-sky-200/30" 
      : "border-sky-500/60 bg-sky-500/20 text-sky-200 shadow-sky-500/30";
  }
  
  const classes = classesBase + tone;
  const animationClass = isVisible 
    ? "translate-y-0 opacity-100 scale-100" 
    : "-translate-y-4 opacity-0 scale-95";

  return (
    <div className="fixed top-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className={`${classes} ${animationClass} pointer-events-none will-change-transform`}>
        {variant === "success" && <span className="mr-1.5">✨</span>}
        {variant === "warning" && <span className="mr-1.5">⚠️</span>}
        {text}
      </div>
    </div>
  );
}


