import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef } from 'react';

import { setAnonymousSessionGetter, setAuthTokenGetter } from '@/lib/api';
import { getAnonymousSessionId } from '@/lib/session';
import { isClerkEnabled } from '@/components/ui/AuthControls';
import { useProject } from '@/context/ProjectContext';

export function ApiAuthBridge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { reloadAfterAuth } = useProject();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isClerkEnabled() || !isLoaded) {
      setAuthTokenGetter(null);
      setAnonymousSessionGetter(() => getAnonymousSessionId());
      return;
    }

    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
      setAnonymousSessionGetter(() => getAnonymousSessionId());
      if (!wasSignedIn.current) {
        void reloadAfterAuth();
      }
      wasSignedIn.current = true;
      return;
    }

    setAuthTokenGetter(null);
    setAnonymousSessionGetter(() => getAnonymousSessionId());
    wasSignedIn.current = false;
  }, [getToken, isSignedIn, isLoaded, reloadAfterAuth]);

  return null;
}
