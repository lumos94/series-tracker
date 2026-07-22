const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILE_NAME = 'tvapp-backup.json';

async function findBackupFileId(accessToken: string): Promise<string | null> {
  const query = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
    fields: 'files(id)',
  });

  const response = await fetch(`${FILES_URL}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Drive list request failed (${response.status})`);
  }

  const data = (await response.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

async function createBackupFile(accessToken: string): Promise<string> {
  const response = await fetch(FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BACKUP_FILE_NAME, parents: ['appDataFolder'] }),
  });
  if (!response.ok) {
    throw new Error(`Drive file creation failed (${response.status})`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function uploadBackup(accessToken: string, payload: unknown): Promise<void> {
  const fileId = (await findBackupFileId(accessToken)) ?? (await createBackupFile(accessToken));

  const response = await fetch(`${UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Drive upload failed (${response.status})`);
  }
}

export async function downloadBackup<T>(accessToken: string): Promise<T | null> {
  const fileId = await findBackupFileId(accessToken);
  if (!fileId) return null;

  const response = await fetch(`${FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Drive download failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
