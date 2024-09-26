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

function Timeuntil({ timestamp }: { timestamp: Date }) {
  const getSecondsUntil = () => ((timestamp.getTime() - Date.now()) / 1000) | 0;
  const [secondsUntil, setSecondsUntil] = useState(getSecondsUntil());
  useEffect(() => {
    const interval = setInterval(() => setSecondsUntil(getSecondsUntil()), 1000);
    return () => clearInterval(interval);
  }, [timestamp]);
  const days = (secondsUntil / 86400) | 0;
  let accountedSeconds = days * 86400;
  const hours = ((secondsUntil - accountedSeconds) / 3600) | 0;
  accountedSeconds += hours * 3600;
  const minutes = ((secondsUntil - accountedSeconds) / 60) | 0;
  accountedSeconds += minutes * 60;
  const seconds = secondsUntil - accountedSeconds;
  return (
    <span>
      {days ? `${days}d ` : ''}
      {hours ? `${hours}h ` : ''}
      {minutes ? `${minutes}m ` : ''}
      {seconds}s
    </span>
  );
}

export default function Page() {
  let { session } = useSession();
  let user = session?.user;

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
              {`Your session will refresh in `}
              <Timeuntil timestamp={session!.refresh_at} />
              {`.`}
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
