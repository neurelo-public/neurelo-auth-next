
import * as jose from 'jose';
import { AuthContext, Session } from './types';

/**
 * Given a JWT payload object from a session token, get the session.
 * 
 * @param payload The JWT payload.
 * @returns The session.
 */
export function getSessionFromPayload(payload: jose.JWTPayload): Session {
    return {
        user: {
            id: payload.sub as string,
            name: (payload.name ?? null) as string | null,
            email: (payload.email ?? null) as string | null,
            image: (payload.picture ?? null) as string | null,
        },
        provider: payload.provider as string,
        provider_account_id: payload.sub as string,
        refresh_at: new Date((payload as any).refresh_at! * 1000),
        expires: new Date(payload.exp! * 1000),
    };
}

/**
 * Given an authentication context, get the name of the session cookie.
 * 
 * @param context The authentication context.
 * @returns The name of the session cookie name.
 */
export function getSessionCookieName(context: AuthContext): string {
    return `neurelo_session_${context.environmentId}`;
}