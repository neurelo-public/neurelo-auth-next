import * as jose from 'jose';
import { AuthContext, Session } from './types';
import { getSessionFromPayload } from './common';
export type * from './types';

/**
 * Slimmed down version of the SDK configuration that only includes the API key and base path.
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
type ServerAuthContext = AuthContextCommon & {
    // FIXME: Update these periodically
    readonly jwks: readonly jose.JWK[]
};

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

export async function getAuthContext(authContextPromise: Promise<ServerAuthContext>): Promise<AuthContext> {
    const authContext = await authContextPromise;

    return {
        authBaseUrl: authContext.authBaseUrl,
        environmentId: authContext.environmentId,
        verifyToken: async (sessionToken: string) => {
            'use server';
            return verifyToken(authContext, sessionToken);
        }
    };
}

export default function NeureloAuth({
    neureloConfig,
}: {
    neureloConfig: SdkConfiguration;
}) {
    const authContextPromise = getAuthContextFromSdkConfig(neureloConfig);
    return {
        getAuthContext: async () => {
            'use server';
            return getAuthContext(authContextPromise);
        }
    }
}