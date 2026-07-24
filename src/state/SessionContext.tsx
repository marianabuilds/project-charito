import React, { createContext, useContext } from 'react';
import { useDetoxSession } from '../hooks/useDetoxSession';

type SessionControls = ReturnType<typeof useDetoxSession>;

const SessionContext = createContext<SessionControls | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useDetoxSession();
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionControls {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
