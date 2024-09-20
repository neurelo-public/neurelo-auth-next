import * as jose from 'jose';
import { AuthContext, Session } from './lib/types';
import { getSessionFromPayload } from './lib/common';
export type * from './lib/types';

/**
 * Slimmed down version of the SDK configuration that only includes the API key and base path.
 * 
 * Usually you would import this from a neurelo-sdk package.
 * 
 * @example
 * import { neureloConfig } from 'neurelo-sdk';
 */
export interface SdkConfiguration {
    readonly apiKey?: string | Promise<string> | ((name: string) => string) | ((name: string) => Promise<string>);
    readonly basePath?: string;
}

/**
 * Get the authentication URL from the SDK configuration.
 *
 * @param config The SDK configuration.
 * @returns The authentication URL.
 */
async function getAuthContextFromSdkConfig(config: SdkConfiguration): Promise<ServerAuthContext> {
    let apiKey = config.apiKey;
    const basePath = config.basePath

    if (!apiKey || !basePath) {
        throw new Error('Both apiKey and basePath are required in the SDK configuration. You may need to set NEURELO_API_KEY and NEURELO_BASE_PATH environment variables');
    }
    if (typeof apiKey === 'function') {
        throw new Error('Function API keys are not supported');
    }
    if (apiKey instanceof Promise) {
        apiKey = await apiKey;
    }

    let authContextBase: AuthContextCommon;
    try {
        const res = await fetch(`${basePath}/auth/apiKeyDetails`, {
            headers: {
                'X-Api-Key': apiKey,
            }
        }).then(res => res.json());
        const { environment_id: environmentId } = res;
        authContextBase = {
            authBaseUrl: `${basePath}/auth/${environmentId}`,
            environmentId,
        }
    } catch (error) {
        throw new Error('Unable to decode API key. Please regenerate the key as it may be an old key format');
    }
    const jwksRes = await fetch(authContextBase.authBaseUrl + '/.well-known/jwks.json');
    if (!jwksRes.ok) {
        throw new Error('Failed to fetch JWKS');
    }
    const { keys } = await jwksRes.json();
    return {
        ...authContextBase,
        jwks: keys as jose.JWK[],
    }
}

type AuthContextCommon = Omit<AuthContext, 'verifyToken'>;

/**
 * The server-side authentication context.
 */
type ServerAuthContext = AuthContextCommon & {
    // FIXME: Update these periodically
    readonly jwks: readonly jose.JWK[]
};

/**
 * Verify a session token.
 *
 * @param authContext The authentication context.
 * @param sessionToken The session token.
 * @returns The session encoded in the token.
 * @throws If the session token is invalid.
 */
async function verifyToken(authContext: ServerAuthContext, sessionToken: string): Promise<Session> {
    let firstError: Error | null = null;
    for (const jwk of authContext.jwks) {
        try {
            const key = await jose.importJWK(jwk);
            const { payload } = await jose.jwtVerify(sessionToken, key, {
                audience: authContext.environmentId,
            });
            return getSessionFromPayload(payload);
        } catch (error) {
            firstError ??= error as Error;
        }
    }
    console.error('Error verifying session token', firstError);
    throw firstError;
}

/**
 * Initialize Neurelo Auth.
 * 
 * @example
 * // file: app/context.ts
 * import NeureloAuth from '@neurelo/auth-next';
 * import { neureloConfig } from 'neurelo-sdk';
 * 
 * const { getAuthContext } = NeureloAuth({
 *    neureloConfig,
 * });
 * export { getAuthContext };
 * 
 * @param neureloConfig The Neurelo SDK configuration.
 * @returns Initialized Neurelo Auth.
 */
export default function NeureloAuth({
    neureloConfig,
}: {
    neureloConfig: SdkConfiguration;
}) {
    const serverAuthContextPromise = getAuthContextFromSdkConfig(neureloConfig);
    return {
        getAuthContext: async () => {
            'use server';
            const authContext = await serverAuthContextPromise;
            return {
                authBaseUrl: authContext.authBaseUrl,
                environmentId: authContext.environmentId,
                verifyToken: async (sessionToken: string) => {
                    'use server';
                    return verifyToken(authContext, sessionToken);
                }
            };
        },
    }
}