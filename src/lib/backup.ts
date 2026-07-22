import { downloadBackup, uploadBackup } from '@/api/drive';
import { exportAllData, getLastSyncedAt, importAllData, setLastSyncedAt, type BackupPayload } from '@/db/queries';
import { getDriveAccessToken, getDriveAccessTokenSilent } from './google-auth';

const AUTO_SYNC_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function backupNow(): Promise<void> {
  const accessToken = await getDriveAccessToken();
  const payload = exportAllData();
  await uploadBackup(accessToken, payload);
  setLastSyncedAt(payload.exportedAt);
}

/** Replaces all local data with the Drive backup. Returns false if no backup exists yet. */
export async function restoreFromDrive(): Promise<boolean> {
  const accessToken = await getDriveAccessToken();
  const payload = await downloadBackup<BackupPayload>(accessToken);
  if (!payload) return false;

  importAllData(payload);
  setLastSyncedAt(new Date().toISOString());
  return true;
}

/** Best-effort background backup on launch. Only runs if Drive was connected before and the last sync is stale; never prompts for sign-in. */
export async function maybeAutoSync(): Promise<void> {
  const lastSyncedAt = getLastSyncedAt();
  const isStale = !lastSyncedAt || Date.now() - new Date(lastSyncedAt).getTime() > AUTO_SYNC_STALE_MS;
  if (!isStale) return;

  try {
    const accessToken = await getDriveAccessTokenSilent();
    if (!accessToken) return;

    const payload = exportAllData();
    await uploadBackup(accessToken, payload);
    setLastSyncedAt(payload.exportedAt);
  } catch {
    // Silent best-effort; user can always back up manually from Profile.
  }
}
