import React from "react";
import { pageShell } from "../ui";

type MobileShellProps = {
  children: React.ReactNode;
};

export function MobileShell({ children }: MobileShellProps) {
  return <div className={pageShell}>{children}</div>;
}
