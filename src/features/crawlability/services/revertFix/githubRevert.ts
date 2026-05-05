/**
 * GitHub revert dispatcher. Walks an applied_fixes row's `committed_sha` and
 * uses GithubClient.revertCommit() to write the parent state back at HEAD.
 *
 * Returns the new commit SHA so the caller can save it as `reverted_commit_sha`.
 */

import { GithubClient } from "@/services/github/githubClient";
import { decryptCredentials, type EncryptedBlob } from "@/utils/credentialsEncryption";

export interface GithubRevertOptions {
  credsBlob: EncryptedBlob; // raw site_connections.credentials JSONB row
  repo: string;
  branch: string;
  committedSha: string;
}

export interface GithubRevertResult {
  ok: boolean;
  error?: string;
  revertedCommitSha?: string;
  revertedFiles?: string[];
}

export async function revertGithubFix(opts: GithubRevertOptions): Promise<GithubRevertResult> {
  let creds: { token: string };
  try {
    creds = decryptCredentials<{ token: string }>(opts.credsBlob);
  } catch {
    return { ok: false, error: "Couldn't decrypt GitHub credentials. Reconnect GitHub." };
  }

  let client: GithubClient;
  try {
    client = new GithubClient(creds.token, opts.repo);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "GitHub client init failed" };
  }

  try {
    const result = await client.revertCommit(opts.committedSha, opts.branch);
    return {
      ok: true,
      revertedCommitSha: result.commitSha,
      revertedFiles: result.revertedFiles,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "GitHub revert failed",
    };
  }
}
