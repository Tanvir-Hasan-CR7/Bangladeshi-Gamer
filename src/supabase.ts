import { fetchJson } from './lib/fetchJson';

type AuthChangeListener = (event: string, session: any) => void;
const authListeners: AuthChangeListener[] = [];

function notifyAuthListeners(event: string, session: any) {
  authListeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

function getStoredSession() {
  try {
    const str = localStorage.getItem('vortex_admin_session');
    if (str) return JSON.parse(str);
  } catch {}
  return null;
}

function setStoredSession(session: any) {
  if (session) {
    localStorage.setItem('vortex_admin_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('vortex_admin_session');
  }
}

class QueryBuilder {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private opValues: any = null;
  private filters: Array<{ col: string; type: string; val: any }> = [];
  private isSingle = false;
  private sortCol: string | null = null;
  private sortAscending = true;
  private limitNum: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    if (this.table === 'profiles') this.table = 'local_profiles';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, type: 'eq', val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, type: 'neq', val });
    return this;
  }

  ilike(col: string, val: any) {
    this.filters.push({ col, type: 'ilike', val });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ col, type: 'gte', val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ col, type: 'lte', val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ col, type: 'gt', val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ col, type: 'lt', val });
    return this;
  }

  in(col: string, val: any[]) {
    this.filters.push({ col, type: 'in', val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.sortCol = col;
    this.sortAscending = options?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitNum = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  insert(values: any) {
    this.operation = 'insert';
    this.opValues = values;
    return this;
  }

  update(values: any) {
    this.operation = 'update';
    this.opValues = values;
    return this;
  }

  upsert(values: any, _options?: any) {
    this.operation = 'upsert';
    this.opValues = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  async then(onfulfilled?: (value: { data: any; error: any; count?: number; status?: number; statusText?: string }) => any, onrejected?: (reason: any) => any) {
    try {
      const targetTable = this.table === 'profiles' ? 'local_profiles' : this.table;
      const res = await fetchJson('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: targetTable,
          operation: this.operation,
          opValues: this.opValues,
          filters: this.filters,
          isSingle: this.isSingle,
          sortCol: this.sortCol,
          sortAscending: this.sortAscending,
          limitNum: this.limitNum
        })
      });

      const result = {
        data: res.data,
        error: res.error ? { message: res.error } : null,
        count: res.count ?? (Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0)),
        status: 200,
        statusText: 'OK'
      };

      return onfulfilled ? onfulfilled(result) : result;
    } catch (err: any) {
      const result = {
        data: null,
        error: { message: err.message || 'Database query failed' },
        count: 0,
        status: 500,
        statusText: 'Internal Error'
      };
      if (onfulfilled) return onfulfilled(result);
      if (onrejected) return onrejected(err);
      return result;
    }
  }
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  auth: {
    async getSession() {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    async getUser() {
      const session = getStoredSession();
      return { data: { user: session?.user || null }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetchJson('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (res.error) {
          return { data: { user: null, session: null }, error: { message: res.error.message || 'Invalid credentials' } };
        }

        const user = res.user;
        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { display_name: user.display_name }
          },
          access_token: 'local_token_' + user.id
        };

        setStoredSession(session);
        notifyAuthListeners('SIGNED_IN', session);

        return { data: { user: session.user, session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message || 'Signin failed' } };
      }
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      try {
        const displayName = options?.data?.display_name || email.split('@')[0];
        const res = await fetchJson('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, display_name: displayName })
        });

        if (res.error) {
          return { data: { user: null, session: null }, error: { message: res.error.message || 'Signup failed' } };
        }

        const user = res.user;
        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { display_name: user.display_name }
          },
          access_token: 'local_token_' + user.id
        };

        setStoredSession(session);
        notifyAuthListeners('SIGNED_IN', session);

        return { data: { user: session.user, session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message || 'Signup failed' } };
      }
    },

    async signOut() {
      setStoredSession(null);
      notifyAuthListeners('SIGNED_OUT', null);
      return { error: null };
    },

    async resetPasswordForEmail(email: string) {
      try {
        const res = await fetchJson('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username: email })
        });
        if (res.error) return { data: null, error: { message: res.error } };
        return { data: res, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },

    async updateUser(attributes: { password?: string; email?: string; data?: any }) {
      try {
        const session = getStoredSession();
        if (!session?.user?.email) {
          return { data: { user: null }, error: { message: 'Not authenticated' } };
        }
        if (attributes.password) {
          await fetchJson('/api/auth/update_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.user.email, new_password: attributes.password })
          });
        }
        return { data: { user: session.user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message || 'Failed to update user' } };
      }
    },

    onAuthStateChange(callback: AuthChangeListener) {
      authListeners.push(callback);
      const session = getStoredSession();
      setTimeout(() => callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session), 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    }
  },

  channel(name: string) {
    const ch = {
      on(_event: string, _opts: any, _callback: Function) {
        return ch;
      },
      subscribe(cb?: Function) {
        if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
        return {
          unsubscribe: () => {}
        };
      }
    };
    return ch;
  },

  removeChannel(_channel: any) {
    return Promise.resolve();
  }
};

export const getBaseApiUrl = (): string => {
  return '';
};

