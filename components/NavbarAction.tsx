"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function NavbarAction({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const slot = document.getElementById("navbar-left-slot");
  if (!slot) return null;

  return createPortal(children, slot);
}
