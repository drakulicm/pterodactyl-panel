import { create } from 'zustand';

import { type SessionUser, sessionUser } from '@/lib/session';

interface SessionStore {
    user: SessionUser | undefined;
    setEmail: (email: string) => void;
}

const useSessionStore = create<SessionStore>((set) => ({
    user: sessionUser,
    setEmail: (email) => set((state) => ({ user: state.user ? { ...state.user, email } : state.user })),
}));

export { useSessionStore };
