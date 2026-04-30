"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "@/components/molecules/Toast";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function AccountTab() {
  const { user, signOut } = useAuth();
  const { updatePasswordAsync, deleteAccountAsync, isPending } = useSettings();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await updatePasswordAsync(data.password);
      toast("Password updated successfully", "success");
      setIsChangingPassword(false);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast(message, "error");
    }
  };

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

      {/* Password change section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Change Password</h3>
        {isChangingPassword ? (
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <Input
              type="password"
              label="New Password"
              {...register("password")}
              error={errors.password?.message}
            />

            <Input
              type="password"
              label="Confirm Password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsChangingPassword(false);
                  reset();
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setIsChangingPassword(true)}>
            Change Password
          </Button>
        )}
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
