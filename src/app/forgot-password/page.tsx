'use client';
import React, { Suspense, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Link from 'next/link';
import toast from 'react-hot-toast';

const getFriendlyResetMessage = (rawMessage: string) => {
  const message = (rawMessage || '').toLowerCase();

  if (message.includes('too many requests') || message.includes('rate limit')) {
    return "Whoa, that was quick. Let's pause for a minute, then try again.";
  }
  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  return "We couldn't send the reset email just now. Please try again in a moment.";
};

const PageForgotPassword = () => {
  useRedirectIfAuthenticated('/');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValue = email.trim();

    if (!emailValue) {
      setErrors({ email: 'Email is required.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      setErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setErrors({ form: getFriendlyResetMessage(error.message) });
      return;
    }

    // Always show the same confirmation regardless of whether the email is
    // registered — this avoids leaking which addresses have accounts.
    setSent(true);
  };

  return (
    <div className={`nc-PageForgotPassword`}>
      <div className="container mb-24 lg:mb-32">
        <div className="max-w-md mx-auto mt-4 rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-6 md:p-8 space-y-6">
          <h2 className="flex items-center text-3xl leading-[115%] md:text-4xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
            Forgot password
          </h2>
          {sent ? (
            <div className="space-y-6 text-center">
              <p className="text-neutral-700 dark:text-neutral-300">
                If an account exists for <span className="font-semibold">{email.trim()}</span>,
                we&apos;ve sent a link to reset your password. Please check your inbox (and your
                spam folder).
              </p>
              <ButtonPrimary
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
              >
                Use a different email
              </ButtonPrimary>
              <span className="block text-center text-neutral-700 dark:text-neutral-300">
                Back to{` `}
                <Link href="/login" className="font-semibold underline">
                  Sign in
                </Link>
              </span>
            </div>
          ) : (
            <>
              <p className="text-center text-neutral-700 dark:text-neutral-300">
                Enter the email address linked to your account and we&apos;ll send you a link to
                reset your password.
              </p>
              {/* FORM */}
              <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Email address</span>
                  <Input
                    type="email"
                    placeholder="example@example.com"
                    className={`mt-1 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                    }}
                  />
                  {errors.email ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.email}</span>
                  ) : null}
                </label>
                <ButtonPrimary type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </ButtonPrimary>
                {errors.form ? <span className="text-xs text-red-600">{errors.form}</span> : null}
              </form>

              {/* ==== */}
              <span className="block text-center text-neutral-700 dark:text-neutral-300">
                Remember your password?{` `}
                <Link href="/login" className="font-semibold underline">
                  Sign in
                </Link>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PageForgotPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <PageForgotPassword />
    </Suspense>
  );
}
