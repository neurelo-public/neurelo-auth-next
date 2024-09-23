'use server';

import { NeureloAuthCredentialApiService } from 'neurelo-sdk';
import { getSession } from './context';

/**
 * This function gets the user info from the authentication provider.
 * It does this by first fetching the user's access token from the database.
 */
export async function getUserInfo(): Promise<any> {
  'use server';
  const session = await getSession();
  if (!session) {
    throw new Error('No session');
  }
  const accounts = (
    await NeureloAuthCredentialApiService.findNeureloAuthCredential(undefined, {
      provider: session.provider,
      providerAccountId: session.provider_account_id,
    })
  ).data.data;
  if (accounts.length === 0) {
    throw new Error('No account found');
  }
  const account = accounts[0];
  const accessToken = account.accessToken!;
  switch (session.provider) {
    case 'gitlab': {
      const res = await fetch('https://gitlab.com/api/v4/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await res.json();
    }
    case 'github': {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await res.json();
    }
    case 'google': {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await res.json();
    }
    default: {
      throw new Error('Unsupported provider: ' + session.provider);
    }
  }
}
