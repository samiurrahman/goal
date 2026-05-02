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

const getFriendlySignupMessage = (rawMessage: string) => {
  const message = rawMessage.toLowerCase();

  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (message.includes('password')) {
    return 'Please use a stronger password and try again.';
  }
  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('too many requests')) {
    return "Whoa, that was quick. Let's pause for a minute, then try again.";
  }

  return "We're having a small sign-up hiccup right now. Please try again in a moment.";
};

const PageSignUp = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = (searchParams.get('userType') === 'agent' ? 'agent' : 'user') as
    | 'user'
    | 'agent';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { user_type: userType },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(getFriendlySignupMessage(error.message));
      return;
    }
    if (data.user) {
      // Create user_details row
      const { error: detailsError } = await supabase
        .from('user_details')
        .insert({ auth_user_id: data.user.id, user_type: userType });
      if (detailsError) {
        toast.error('Account created, but profile setup failed. Please contact support.');
        return;
      }
      // If agent, create agents row
      if (userType === 'agent') {
        const { error: agentError } = await supabase.from('agents').insert({
          auth_user_id: data.user.id,
          email_id: email,
          name: email.split('@')[0],
        });
        if (agentError) {
          toast.error('Account created, but agent profile setup failed. Please contact support.');
          return;
        }
      }
      // Store session token if available (email confirmation may not return session immediately)
      if (data.session?.access_token) {
        storeAccessToken(data.session.access_token);
      }
      toast.success('Account created successfully. Please sign in.');
      router.push('/login');
    }
  };

  const handleOAuthSignUp = async (provider: 'google') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}?userType=${userType}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div className={`nc-PageSignUp  `}>
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          {userType === 'agent' ? 'Sign up as Agent' : 'Sign up'}
        </h2>
        <div className="max-w-md mx-auto space-y-6 ">
          <div className="grid gap-3">
            <button
              type="button"
              className="nc-will-change-transform flex w-full rounded-lg bg-primary-50 dark:bg-neutral-800 px-4 py-3 transform transition-transform sm:px-6 hover:translate-y-[-2px]"
              onClick={() => handleOAuthSignUp('google')}
              disabled={loading}
            >
              <Image className="flex-shrink-0" src={googleSvg} alt="Continue with Google" />
              <h3 className="flex-grow text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:text-sm">
                Sign up with Google
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
          <form className="grid grid-cols-1 gap-6" onSubmit={handleSignUp}>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Email address</span>
              <Input
                type="email"
                placeholder="example@example.com"
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="flex justify-between items-center text-neutral-800 dark:text-neutral-200">
                Password
              </span>
              <Input
                type="password"
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? 'Signing up...' : 'Continue'}
            </ButtonPrimary>
          </form>

          {/* ==== */}
          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            Already have an account? {` `}
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          </span>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default PageSignUp;
