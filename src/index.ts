import * as jose from 'jose';
import { AuthContext, Session } from './lib/types';
import { getSessionCookieName, getSessionFromPayload } from './lib/common';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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

type AuthContextCommon = Pick<AuthContext, 'authBaseUrl'|'environmentId'>;

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

async function signIn(authContext: ServerAuthContext): Promise<never> {
    redirect(authContext.authBaseUrl + '/signin');
}

async function signOut(authContext: ServerAuthContext): Promise<void> {
    const cookieStore = cookies();
    const cookieName = getSessionCookieName(authContext);
    cookieStore.delete(cookieName);
}

/**
 * The result of invoking {@link NeureloAuth}.
 * It contains methods to set up and interact with Neurelo User Auth in your Next.js app.
 */
export type NeureloAuthResult = {
    /**
     * Get the client-side authentication context.
     */
    getAuthContext: () => Promise<AuthContext>;

    /**
     * Get the session of the currently logged in user.
     */
    getSession: () => Promise<Session | null>;

    /**
     * Redirect the browser to the sign in page.
     */
    signIn: () => Promise<never>;

    /**
     * Sign out the currently logged in user.
     */
    signOut: () => Promise<void>;
};

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
}): NeureloAuthResult {
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
                },
                signIn: async () => {
                    'use server';
                    return await signIn(authContext);
                },
                signOut: async () => {
                    'use server';
                    return await signOut(authContext);
                }
            };
        },
        getSession: async () => {
            'use server';
            const cookieStore = cookies()
            const authContext = await serverAuthContextPromise;
            const cookieName = getSessionCookieName(authContext);
            const sessionToken = cookieStore.get(cookieName);
            if (!sessionToken) {
                return null;
            }
            return verifyToken(authContext, sessionToken.value);
        },
        signIn: async () => {
            'use server';
            const authContext = await serverAuthContextPromise;
            return await signIn(authContext);
        },
        signOut: async () => {
            'use server';
            const authContext = await serverAuthContextPromise;
            return await signOut(authContext);
        }
    }
}