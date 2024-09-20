/**
 * The client-side authentication context.
 */
export type AuthContext = {
    /**
     * The base URL for the authentication service.
     */
    readonly authBaseUrl: string;

    /**
     * The environment ID.
     */
    readonly environmentId: string;

    /**
     * Verify a session token.
     *
     * @param sessionToken The session token.
     * @returns The session encoded in the token.
     * @throws If the session token is invalid.
     */
    readonly verifyToken: (sessionToken: string) => Promise<Session>
}

/**
 * A user session.
 * 
 * @example
 * ```typescript
 * const session: Session = {
 *     user: {
 *         id: '123',
 *         name: 'John Doe',
 *         email: 'john-doe@neurelo.com',
 *         image: 'https://example.com/john-doe.jpg',
 *     },
 *     provider: 'google',
 *     provider_account_id: '123',
 *     refresh_at: new Date('2024-09-20T15:39:02Z'),
 *     expires: new Date('2024-09-20T15:39:02Z'),
 * };
 */
export type Session = {
    /**
     * Some basic user information. This reflects the `neureloAuthUser` object in the database.
     */
    readonly user: {
        readonly id: string;
        readonly name: string | null;
        readonly email: string | null;
        readonly image: string | null;
    };

    /**
     * The authentication provider id that was used to authenticate the user.
     */
    readonly provider: string;

    /**
     * The account id for the user with the authentication provider.
     */
    readonly provider_account_id: string;

    /**
     * The time at which the session should be refreshed.
     */
    readonly refresh_at: Date;

    /**
     * The time at which the session expires.
     */
    readonly expires: Date;
}