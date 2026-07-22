import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

/** Ensures a signed-in Google session (silent if possible, interactive otherwise) and returns a Drive-scoped access token. */
export async function getDriveAccessToken(): Promise<string> {
  if (!WEB_CLIENT_ID) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Add it to .env.local.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  if (GoogleSignin.hasPreviousSignIn()) {
    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== 'success') {
      const interactive = await GoogleSignin.signIn();
      if (!isSuccessResponse(interactive)) {
        throw new Error('Google sign-in was cancelled.');
      }
    }
  } else {
    const interactive = await GoogleSignin.signIn();
    if (!isSuccessResponse(interactive)) {
      throw new Error('Google sign-in was cancelled.');
    }
  }

  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

/** Returns a Drive-scoped access token only if a session can be restored silently; never shows an interactive prompt. */
export async function getDriveAccessTokenSilent(): Promise<string | null> {
  if (!WEB_CLIENT_ID || !GoogleSignin.hasPreviousSignIn()) return null;

  const silent = await GoogleSignin.signInSilently();
  if (silent.type !== 'success') return null;

  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}
