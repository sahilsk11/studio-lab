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

  if (isClerkEnabled() && isLoaded) {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    setAnonymousSessionGetter(() => getAnonymousSessionId());
  }

  useEffect(() => {
    if (!isClerkEnabled() || !isLoaded) return;

    if (isSignedIn) {
      if (!wasSignedIn.current) {
        void reloadAfterAuth();
      }
      wasSignedIn.current = true;
      return;
    }

    wasSignedIn.current = false;
  }, [isSignedIn, isLoaded, reloadAfterAuth]);

  return null;
}
