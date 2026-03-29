"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function onDelete() {
    setPending(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setPending(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setPending(false);
    }
  }

  if (!confirmOpen) {
    return (
      <button
        type="button"
        className="btn-danger-outline"
        onClick={() => setConfirmOpen(true)}
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="delete-account-confirm">
      <p className="alert-error" role="alert">
        This removes your login and saved collection permanently. Continue?
      </p>
      <div className="delete-account-confirm__actions">
        <button
          type="button"
          className="btn-danger"
          disabled={pending}
          onClick={onDelete}
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => setConfirmOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
