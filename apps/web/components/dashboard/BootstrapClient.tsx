"use client";

import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

export function BootstrapClient() {
  const boot = useMutation(api.init.bootstrap);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void boot({}).catch(() => {});
  }, [boot]);
  return null;
}
