'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';
import googleSvg from '@/images/Google.svg';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Image from 'next/image';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const getFriendlyAuthMessage = (rawMessage: string) => {
  const original = (rawMessage || '').trim();
  const message = original.toLowerCase();

  if (original === 'Invalid login credentials') {
    return "Hmm, that combo didn't match. Please double-check your email and password and give it another try.";
  }

  if (message.includes('invalid login credentials')) {
    return "Hmm, that combo didn't match. Please double-check your email and password and give it another try.";
  }
  if (message.includes('email not confirmed')) {
    return "Looks like we haven't officially met yet. Please verify your email first, then come right back.";
  }
  if (message.includes('too many requests')) {
    return "Whoa, that was quick. Let's pause for a minute, then try again.";
  }

  return "We're having a small sign-in hiccup right now. Please try again in a moment.";
};

const PageLogin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string; form?: string } = {};
    const emailValue = email.trim();

    if (!emailValue) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    });

    setLoading(false);
    if (error) {
      const friendlyMessage = getFriendlyAuthMessage(error.message);
      const isInvalidCredentials = error.message
        ?.toLowerCase()
        .includes('invalid login credentials');
      const isEmailNotConfirmed = error.message?.toLowerCase().includes('email not confirmed');

      if (isInvalidCredentials || isEmailNotConfirmed) {
        toast.error(friendlyMessage);
        setErrors({});
      } else {
        setErrors({ form: friendlyMessage });
      }
    } else {
      // Store access token in cookie (secure, sameSite strict)
      if (data?.session?.access_token) {
        storeAccessToken(data.session.access_token);
      }
      // Redirect after login
      const redirectPath = searchParams.get('redirect') || '/';
      router.push(redirectPath);
    }
  };

  return (
    <div className={`nc-PageLogin`}>
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Login
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          <div className="grid gap-3">
            <button
              type="button"
              className="flex w-full rounded-lg bg-primary-50 dark:bg-neutral-800 px-4 py-3 transform transition-transform sm:px-6 hover:translate-y-[-2px]"
              onClick={async () => {
                setLoading(true);
                // For OAuth, Supabase will handle the redirect and set the cookie on callback page
                const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
                if (error) {
                  toast.error('Google sign-in failed. Please try again.');
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <Image className="flex-shrink-0" src={googleSvg} alt="Continue with Google" />
              <h3 className="flex-grow text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:text-sm">
                Continue with Google
              </h3>
            </button>
          </div>
          {/* OR */}
          <div className="relative text-center">
            <span className="relative z-10 inline-block px-4 font-medium text-sm bg-white dark:text-neutral-400 dark:bg-neutral-900">
              OR
            </span>
            <div className="absolute left-0 w-full top-1/2 transform -translate-y-1/2 border border-neutral-100 dark:border-neutral-800"></div>
          </div>
          {/* FORM */}
          <form className="grid grid-cols-1 gap-6" onSubmit={handleSignIn} noValidate>
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
            <label className="block">
              <span className="flex justify-between items-center text-neutral-800 dark:text-neutral-200">
                Password
                <Link href="/forgot-password" className="text-sm underline font-medium">
                  Forgot password?
                </Link>
              </span>
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
              ) : null}
            </label>
            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Continue'}
            </ButtonPrimary>
            {errors.form ? <span className="text-xs text-red-600">{errors.form}</span> : null}
          </form>

          {/* ==== */}
          <div className="flex flex-col gap-2 text-center text-neutral-700 dark:text-neutral-300">
            <span>
              New user?{` `}
              <Link href="/signup?userType=user" className="font-semibold underline">
                Create an account
              </Link>
            </span>
            <span>
              New agent?{` `}
              <Link href="/signup?userType=agent" className="font-semibold underline">
                Create an account
              </Link>
            </span>
          </div>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default PageLogin;
