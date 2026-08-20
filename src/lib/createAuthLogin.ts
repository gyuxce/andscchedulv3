import type { AppRole, UserStatus } from '../types';
import { getSupabase } from './supabase';

export type CreateAuthLoginInput = {
  email: string;
  password: string;
  role: AppRole;
  status?: UserStatus;
  /** Display name stored only in local UI / audit; Auth uses email. */
  name?: string;
  /** Master Sensei id — disimpan ke profiles.sensei_id agar RBAC/ketersediaan tertaut. */
  senseiId?: string | null;
};

export type CreateAuthLoginResult =
  | { ok: true; userId: string; alreadyExisted?: boolean }
  | { ok: false; error: string };

/**
 * Create a Supabase Auth login from the dashboard while Super Admin stays signed in.
 * Uses signUp + session restore (no service-role key in the browser).
 *
 * Requirement: Auth → Providers → Email → "Confirm email" sebaiknya OFF di staging,
 * atau user harus di-confirm manual di Supabase sebelum bisa login.
 */
export async function createAuthLogin(input: CreateAuthLoginInput): Promise<CreateAuthLoginResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase belum dikonfigurasi' };

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !email.includes('@')) return { ok: false, error: 'Email login tidak valid' };
  if (password.length < 6) return { ok: false, error: 'Password minimal 6 karakter' };

  const { data: existingSessionData } = await supabase.auth.getSession();
  const adminSession = existingSessionData.session;
  if (!adminSession) return { ok: false, error: 'Sesi admin tidak ditemukan. Login ulang dulu.' };

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: input.role,
        name: input.name || email.split('@')[0]
      }
    }
  });

  // Always try to restore admin session if signUp switched us away.
  const { data: afterData } = await supabase.auth.getSession();
  if (!afterData.session || afterData.session.user.id !== adminSession.user.id) {
    const restored = await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token
    });
    if (restored.error || !restored.data.session) {
      return {
        ok: false,
        error:
          'Akun mungkin terbuat, tapi sesi admin gagal dipulihkan. Refresh halaman dan login ulang sebagai admin.'
      };
    }
  }

  if (signUpError) {
    const message = signUpError.message || 'Gagal membuat akun Auth';
    if (/already|registered|exists/i.test(message)) {
      return {
        ok: false,
        error:
          'Email ini sudah punya akun Auth. Set/reset password di Supabase Authentication, atau minta Sensei login dengan password yang sudah ada.'
      };
    }
    return { ok: false, error: message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return {
      ok: false,
      error:
        'Auth tidak mengembalikan user id. Cek Auth settings (Confirm email) di Supabase.'
    };
  }

  const status = input.status ?? 'Approved';
  const profilePayload: Record<string, unknown> = {
    id: userId,
    email,
    role: input.role,
    status
  };
  if (input.senseiId) {
    profilePayload.sensei_id = input.senseiId;
  }

  const existing = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (existing.data) {
    const updated = await supabase
      .from('profiles')
      .update({
        email,
        role: input.role,
        status,
        ...(input.senseiId ? { sensei_id: input.senseiId } : {})
      })
      .eq('id', userId);
    if (updated.error) return { ok: false, error: updated.error.message };
  } else {
    const inserted = await supabase.from('profiles').insert(profilePayload);
    if (inserted.error) {
      // Race: ensureProfile may have inserted Pending already
      const updated = await supabase
        .from('profiles')
        .update({
          email,
          role: input.role,
          status,
          ...(input.senseiId ? { sensei_id: input.senseiId } : {})
        })
        .eq('id', userId);
      if (updated.error) return { ok: false, error: inserted.error.message };
    }
  }

  return { ok: true, userId };
}
