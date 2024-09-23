'use client';
import { useSession } from '@neurelo/auth-next/react';
import { useEffect, useState } from 'react';
import { getUserInfo } from './userinfo';

function SignIn() {
  let { signIn } = useSession();
  return (
    <form action={signIn}>
      <p>You are not logged in</p>
      <button type="submit">Sign in</button>
    </form>
  );
}

function SignOut() {
  let { signOut } = useSession();
  return (
    <form action={signOut}>
      <button type="submit">Sign out</button>
    </form>
  );
}

export default function Page() {
  let { session } = useSession();
  let user = session?.user;

  const [refreshIn, setRefreshIn] = useState<number | undefined>();
  useEffect(() => {
    const updateRefreshIn = () => {
      if (session) {
        setRefreshIn((session.refresh_at.getTime() - Date.now()) / 1000);
      }
    };
    updateRefreshIn();
    const interval = setInterval(updateRefreshIn, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const [userInfo, setUserInfo] = useState<unknown | Error>();

  return (
    <section>
      <h1>Neurelo User Auth</h1>
      <div>
        {user ? (
          <>
            <p>
              {`Welcome ${user.name}`}
              <br />
              {`Your session will refresh in ${Math.round(refreshIn!)} seconds`}
            </p>
            <SignOut />
            <h2>Raw Session</h2>
            <pre>{JSON.stringify(session, null, 2)}</pre>
            <h2>UserInfo</h2>
            <p>
              You can get the raw user info from the authentication provider using the raw session
              token stored in your database.
            </p>
            <input
              type="button"
              value="Fetch User Info"
              onClick={async () => {
                try {
                  const userInfo = await getUserInfo();
                  setUserInfo(userInfo);
                } catch (error) {
                  setUserInfo(error);
                }
              }}
            />
            {userInfo &&
              (userInfo instanceof Error ? (
                <p>Error fetching user info: {userInfo.message}</p>
              ) : (
                <>
                  <p>Last fetched user info</p>
                  <pre>{JSON.stringify(userInfo, null, 2)}</pre>
                </>
              ))}
          </>
        ) : (
          <SignIn />
        )}
      </div>
    </section>
  );
}
