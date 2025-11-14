"use client";

import * as React from "react";
import { DASHBOARD_REFRESH_FLAG } from "@/lib/constants";

export function useDashboardRefreshEffect(onRefresh: () => void) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const needsRefresh = window.sessionStorage.getItem(DASHBOARD_REFRESH_FLAG);
    if (!needsRefresh) return;
    window.sessionStorage.removeItem(DASHBOARD_REFRESH_FLAG);
    onRefresh();
  }, [onRefresh]);
}

export function useDashboardNavigationFlag() {
  return React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(DASHBOARD_REFRESH_FLAG, "true");
  }, []);
}
