import NeureloAuth from 'neurelo-auth-next';
import { neureloConfig } from 'neurelo-sdk';

const { getAuthContext } = NeureloAuth({
    neureloConfig,
})
export { getAuthContext }