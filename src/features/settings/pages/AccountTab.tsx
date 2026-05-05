"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "@/components/molecules/Toast";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { supabase } from "@/services/supabase";
import { humanizeAuthError } from "@/utils/authErrors";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type EmailFormData = z.infer<typeof emailSchema>;

export function AccountTab() {
  const { user, signOut } = useAuth();
  const { deleteAccountAsync, isPending } = useSettings();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailUpdating, setEmailUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user?.email ?? "" },
  });

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

  const onSubmitEmail = async (data: EmailFormData) => {
    if (data.email === user?.email) {
      setIsEditingEmail(false);
      return;
    }
    setEmailUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: data.email });
      if (error) throw error;
      toast(
        `Confirmation link sent to ${data.email}. Click it to finish the change.`,
        "success",
      );
      setIsEditingEmail(false);
    } catch (err) {
      toast(humanizeAuthError(err), "error");
    } finally {
      setEmailUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email section */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
            Email Address
          </p>
          {!isEditingEmail && (
            <button
              type="button"
              onClick={() => {
                reset({ email: user?.email ?? "" });
                setIsEditingEmail(true);
              }}
              className="text-sm text-[var(--color-primary)] hover:underline font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingEmail ? (
          <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-3">
            <Input
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <p className="text-xs text-[var(--color-fg-muted)]">
              We&apos;ll send a confirmation link to the new address. The change takes effect once you click it.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingEmail(false)}
                disabled={emailUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={emailUpdating}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-lg font-semibold">{user?.email}</p>
        )}
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
