import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Dropdown/menu anchored to a button, portaled to body so it stacks above fixed UI (e.g. keyboard). */
export default function AnchoredPortal({
  anchorRef,
  open,
  children,
  className = "",
  align = "right",
  dataAttr,
}) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        right: window.innerWidth - r.right,
        left: r.left,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  const style =
    align === "right"
      ? { position: "fixed", top: pos.top, right: pos.right, zIndex: 50 }
      : { position: "fixed", top: pos.top, left: pos.left, zIndex: 50 };

  return createPortal(
    <div
      {...(dataAttr ? { [dataAttr.name]: dataAttr.value } : {})}
      className={className}
      style={{
        ...style,
        maxHeight: `calc(100dvh - ${pos.top}px - 8px)`,
        overflowY: "auto",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
