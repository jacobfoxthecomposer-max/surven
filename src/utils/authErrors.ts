/**
 * Maps raw Supabase auth errors to plain-English messages for end users.
 * Falls back to the original message if no rule matches, since Supabase's
 * own messages are usually fine.
 */
export function humanizeAuthError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Something went wrong. Please try again.";
  }
  const m = err.message.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Email or password doesn't match. Try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email — check your inbox for the verification link.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (m.includes("user already registered") || m.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("password should be") || m.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with an uppercase letter and a number.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Couldn't reach our servers. Check your connection and try again.";
  }

  return err.message;
}
