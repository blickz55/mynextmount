"use client";

import { signOut } from "next-auth/react";

/**
 * Used when the DB has no user row for a still-valid session (stale JWT / migration).
 */
export function AccountStaleSessionActions() {
  return (
    <p className="status-block">
      <button
        type="button"
        className="btn-primary"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out and sign in again
      </button>
    </p>
  );
}
