import neureloAuthNext from 'neurelo-auth-next';
import { neureloConfig } from 'neurelo-sdk';

const { getAuthContext } = neureloAuthNext({
    neureloConfig,
})
export { getAuthContext }