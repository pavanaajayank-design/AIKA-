import type { SupabaseClient, User } from '@supabase/supabase-js';
import { credentialsSchema } from './demo';
import type {
  AppSession,
  AuthInput,
  AuthService,
  AuthStateListener,
  SignUpResult,
} from '../models/contracts';

function toAppSession(user: User): AppSession {
  const metadataName = user.user_metadata?.display_name;
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split('@')[0] || 'AIKA traveller';

  return {
    id: user.id,
    name,
    email: user.email || '',
    mode: 'authenticated',
  };
}

function throwAuthError(error: { message: string }) {
  throw new Error(error.message || 'Supabase authentication failed. Please try again.');
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  async function verifiedSession(accessToken?: string): Promise<AppSession | null> {
    const { data, error } = accessToken
      ? await client.auth.getUser(accessToken)
      : await client.auth.getUser();

    if (error) throwAuthError(error);
    return data.user ? toAppSession(data.user) : null;
  }

  async function requireVerifiedSession(accessToken?: string): Promise<AppSession> {
    const session = await verifiedSession(accessToken);
    if (!session) {
      throw new Error('A verified sign-in session could not be established. Please try again.');
    }
    return session;
  }

  return {
    mode: 'supabase',

    async signIn(input: AuthInput) {
      const credentials = credentialsSchema.parse(input);
      const { data, error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throwAuthError(error);
      if (!data.session) {
        throw new Error('Supabase did not establish a session. Please confirm your email and try again.');
      }
      return requireVerifiedSession(data.session.access_token);
    },

    async signUp(input: AuthInput): Promise<SignUpResult> {
      const credentials = credentialsSchema.parse(input);
      const { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { display_name: credentials.name || '' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throwAuthError(error);
      if (!data.session) {
        return { session: null, confirmationRequired: true };
      }
      return {
        session: await requireVerifiedSession(data.session.access_token),
        confirmationRequired: false,
      };
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throwAuthError(error);
    },

    restoreSession() {
      return verifiedSession();
    },

    onAuthStateChange(listener: AuthStateListener) {
      let revision = 0;
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        const currentRevision = ++revision;
        if (event === 'SIGNED_OUT' || !session) {
          listener(null, event);
          return;
        }

        // Defer Auth API calls until after Supabase's synchronous event callback.
        window.setTimeout(() => {
          void requireVerifiedSession(session.access_token)
            .then((verified) => {
              if (currentRevision === revision) listener(verified, event);
            })
            .catch(() => {
              if (currentRevision === revision) listener(null, event);
            });
        }, 0);
      });

      return () => {
        revision++;
        subscription.unsubscribe();
      };
    },

    async requestPasswordReset(email: string) {
      const validEmail = credentialsSchema.shape.email.parse(email);
      const { error } = await client.auth.resetPasswordForEmail(validEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throwAuthError(error);
    },

    async updatePassword(password: string) {
      const validPassword = credentialsSchema.shape.password.parse(password);
      const { data, error } = await client.auth.updateUser({ password: validPassword });
      if (error) throwAuthError(error);
      if (!data.user) {
        throw new Error('The password was not updated. Please request a new reset link.');
      }
      return toAppSession(data.user);
    },
  };
}
