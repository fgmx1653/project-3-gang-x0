"use client";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { logoutClient } from "@/lib/clientAuth";

type Props = { redirect?: string; variant?: string; children?: React.ReactNode };

export default function LogoutButton({ redirect = "/login", variant = "outline", children }: Props) {
  return (
    <Button
      variant={variant as any}
      onClick={() => {
        // Clear legacy localStorage session
        logoutClient();
        // Trigger next-auth signOut to clear session cookies
        signOut({ callbackUrl: redirect });
      }}
    >
      {children || "Log out"}
    </Button>
  );
}
