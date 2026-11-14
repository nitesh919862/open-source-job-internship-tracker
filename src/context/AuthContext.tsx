import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  bookmarksApi,
  getStoredToken,
  healthApi,
  setStoredToken,
} from '../services/api';
import type { DatabaseStatusInfo, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  bookmarkedIds: Set<string>;
  databaseStatus: DatabaseStatusInfo | null;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    skills?: string[];
    headline?: string;
    location?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshBookmarks: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatusInfo | null>(null);

  const refreshBookmarks = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setBookmarkedIds(new Set());
      return;
    }
    try {
      const { bookmarks } = await bookmarksApi.list();
      setBookmarkedIds(new Set(bookmarks.map((b) => b.opportunityId)));
    } catch {
      setBookmarkedIds(new Set());
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setBookmarkedIds(new Set());
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await authApi.getMe();
      setUser(me);
      await refreshBookmarks();
    } catch {
      setStoredToken(null);
      setUser(null);
      setBookmarkedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [refreshBookmarks]);

  useEffect(() => {
    refreshUser();
    healthApi
      .getHealth()
      .then((res) => setDatabaseStatus(res.database))
      .catch(() => null);
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: loggedIn } = await authApi.login({ email, password });
      setStoredToken(token);
      setUser(loggedIn);
      await refreshBookmarks();
      return loggedIn;
    },
    [refreshBookmarks]
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      skills?: string[];
      headline?: string;
      location?: string;
    }) => {
      const { token, user: created } = await authApi.register(payload);
      setStoredToken(token);
      setUser(created);
      setBookmarkedIds(new Set());
      return created;
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setBookmarkedIds(new Set());
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        bookmarkedIds,
        databaseStatus,
        login,
        register,
        logout,
        refreshUser,
        refreshBookmarks,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
