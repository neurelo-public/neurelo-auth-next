import NeureloAuth from '@neurelo/auth-next';
import { neureloConfig } from 'neurelo-sdk';

const { getAuthContext, getSession, signIn, signOut } = NeureloAuth({
  neureloConfig,
});

export { getAuthContext, getSession, signIn, signOut };
