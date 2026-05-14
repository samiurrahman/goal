'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { removeAccessToken } from '@/utils/authToken';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const MIN_PASSWORD_LENGTH = 8;

const getFriendlyUpdateMessage = (rawMessage: string) => {
  const message = (rawMessage || '').toLowerCase();

  if (
    message.includes('expired') ||
    message.includes('invalid') ||
    message.includes('token') ||
    message.includes('session')
  ) {
    return 'This reset link has expired or is no longer valid. Please request a new one.';
  }
  if (message.includes('different') || message.includes('same as the old')) {
    return 'Your new password must be different from your current one.';
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return "Whoa, that was quick. Let's pause for a minute, then try again.";
  }
  if (message.includes('password')) {
    return 'Please choose a stronger password and try again.';
  }

  return "We couldn't update your password just now. Please try again in a moment.";
};

// 'checking' — waiting for the Supabase client to parse the recovery token
// from the URL. 'ready' — a recovery session is in place, show the form.
// 'invalid' — no recovery session arrived; the link is missing or expired.
type Status = 'checking' | 'ready' | 'invalid';

const PageResetPassword = () => {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The recovery link carries the token in the URL hash. The Supabase client
    // parses it asynchronously and fires PASSWORD_RECOVERY once the temporary
    // session is established.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    // Cover the case where the client already finished processing the hash
    // before this effect subscribed to auth changes.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data?.session) {
        setStatus('ready');
        return;
      }
      // Give hash detection a brief window before declaring the link dead.
      setTimeout(() => {
        if (cancelled) return;
        setStatus((prev) => (prev === 'checking' ? 'invalid' : prev));
      }, 2500);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { password?: string; confirmPassword?: string; form?: string } = {};

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setErrors({ form: getFriendlyUpdateMessage(error.message) });
      return;
    }

    // The recovery session is meant only for this single action — drop it so
    // the user explicitly signs in again with their new password.
    await supabase.auth.signOut();
    removeAccessToken();
    setLoading(false);
    toast.success('Password updated. Please sign in with your new password.');
    router.replace('/login');
  };

  return (
    <div className={`nc-PageResetPassword`}>
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Reset password
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          {status === 'checking' ? (
            <p className="text-center text-neutral-700 dark:text-neutral-300">
              Verifying your reset link...
            </p>
          ) : null}

          {status === 'invalid' ? (
            <div className="space-y-6 text-center">
              <p className="text-neutral-700 dark:text-neutral-300">
                This reset link is invalid or has expired. Reset links can only be used once and
                are valid for a limited time.
              </p>
              <ButtonPrimary type="button" onClick={() => router.push('/forgot-password')}>
                Request a new link
              </ButtonPrimary>
              <span className="block text-center text-neutral-700 dark:text-neutral-300">
                Back to{` `}
                <Link href="/login" className="font-semibold underline">
                  Sign in
                </Link>
              </span>
            </div>
          ) : null}

          {status === 'ready' ? (
            <>
              <p className="text-center text-neutral-700 dark:text-neutral-300">
                Choose a new password for your account.
              </p>
              {/* FORM */}
              <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">New password</span>
                  <Input
                    type="password"
                    className={`mt-1 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                    }}
                  />
                  {errors.password ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.password}</span>
                  ) : (
                    <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 block">
                      At least {MIN_PASSWORD_LENGTH} characters.
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">
                    Confirm new password
                  </span>
                  <Input
                    type="password"
                    className={`mt-1 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                        form: undefined,
                      }));
                    }}
                  />
                  {errors.confirmPassword ? (
                    <span className="mt-1 text-xs text-red-600 block">
                      {errors.confirmPassword}
                    </span>
                  ) : null}
                </label>
                <ButtonPrimary type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update password'}
                </ButtonPrimary>
                {errors.form ? <span className="text-xs text-red-600">{errors.form}</span> : null}
              </form>
            </>
          ) : null}
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default PageResetPassword;
