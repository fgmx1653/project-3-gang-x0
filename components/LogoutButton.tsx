"use client";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { logoutClient } from "@/lib/clientAuth";
import { useRouter } from "next/navigation";

type Props = { redirect?: string; variant?: string; children?: React.ReactNode };

export default function LogoutButton({ redirect = "/login", variant = "outline", children }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    // Clear legacy localStorage session
    logoutClient();
    
    // Only call next-auth signOut if there's an active NextAuth session
    // (i.e., user logged in via Google OAuth, not traditional username/password)
    if (session) {
      await signOut({ callbackUrl: redirect });
    } else {
      // For traditional login (localStorage-based), just redirect
      router.push(redirect);
    }
  };

  return (
    <Button
      variant={variant as any}
      onClick={handleLogout}
    >
      {children || "Log out"}
    </Button>
  );
}
