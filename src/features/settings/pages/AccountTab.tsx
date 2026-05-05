"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "@/components/molecules/Toast";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/atoms/Button";

export function AccountTab() {
  const { user, signOut } = useAuth();
  const { deleteAccountAsync, isPending } = useSettings();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountAsync();
      toast("Account deleted successfully", "success");
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deletion failed";
      toast(message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Email section */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
          Email Address
        </p>
        <p className="mt-2 text-lg font-semibold">{user?.email}</p>
      </div>

      {/* Password section */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
        <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
          Password
        </p>
        <p className="text-sm text-[var(--color-fg-secondary)]">
          To change your password, sign out and use{" "}
          <Link
            href="/forgot-password"
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            Forgot password
          </Link>{" "}
          on the sign-in page. We&apos;ll email you a secure reset link.
        </p>
      </div>

      {/* Danger zone */}
      <div className="space-y-4 p-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
        <h3 className="text-lg font-semibold text-[var(--color-danger)]">Danger Zone</h3>
        <p className="text-sm text-[var(--color-fg-secondary)]">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
        >
          Delete Account
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        message="This action cannot be undone. All your data including businesses and scans will be permanently deleted."
        confirmLabel="Delete Account"
        confirmVariant="danger"
        isLoading={isPending}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
