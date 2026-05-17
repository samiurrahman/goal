'use client';
import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';
import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated';
import { insertAgentWithUniqueSlug, ReservedSlugError } from '@/lib/slug';
import googleSvg from '@/images/Google.svg';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

type FormErrors = {
  firstName?: string;
  lastName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  agencyName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;
// E.164-ish: optional leading +, 7-15 digits, allow common separators in input
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

const validatePassword = (password: string): string | undefined => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return undefined;
};

const PageSignUp = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  useRedirectIfAuthenticated('/');
  const userType = (searchParams.get('userType') === 'agent' ? 'agent' : 'user') as
    | 'user'
    | 'agent';
  const isAgent = userType === 'agent';

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // User-only
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Agent-only
  const [agencyName, setAgencyName] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const heading = useMemo(() => (isAgent ? 'Sign up as Agent' : 'Sign up'), [isAgent]);

  const clearError = (key: keyof FormErrors) => {
    if (!errors[key]) return;
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (isAgent) {
      if (!agencyName.trim()) next.agencyName = 'Agency name is required.';
      if (!contactFirstName.trim()) next.contactFirstName = 'First name is required.';
      if (!contactLastName.trim()) next.contactLastName = 'Last name is required.';
      if (!phone.trim()) next.phone = 'Phone number is required.';
      else if (!PHONE_RE.test(phone.trim())) next.phone = 'Please enter a valid phone number.';
    } else {
      if (!firstName.trim()) next.firstName = 'First name is required.';
      if (!lastName.trim()) next.lastName = 'Last name is required.';
    }

    const emailValue = email.trim();
    if (!emailValue) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(emailValue)) next.email = 'Please enter a valid email address.';

    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';

    if (!acceptTerms) next.acceptTerms = 'You must agree to the Terms and Privacy Policy.';

    return next;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    const emailValue = email.trim();
    const profileFirstName = isAgent ? contactFirstName.trim() : firstName.trim();
    const profileLastName = isAgent ? contactLastName.trim() : lastName.trim();
    const fullName = `${profileFirstName} ${profileLastName}`.trim();
    const trimmedAgencyName = agencyName.trim();
    const trimmedPhone = phone.trim();

    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: {
        data: {
          user_type: userType,
          first_name: profileFirstName,
          last_name: profileLastName,
          full_name: fullName,
          ...(isAgent
            ? { agency_name: trimmedAgencyName, phone: trimmedPhone }
            : {}),
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(getFriendlySignupMessage(error.message));
      return;
    }

    if (!data.user) {
      setLoading(false);
      toast.error("We couldn't finish creating your account. Please try again.");
      return;
    }

    const { error: detailsError } = await supabase.from('user_details').insert({
      auth_user_id: data.user.id,
      user_type: userType,
      first_name: profileFirstName,
      last_name: profileLastName,
      phone: isAgent ? trimmedPhone : null,
    });
    if (detailsError) {
      setLoading(false);
      toast.error('Account created, but profile setup failed. Please contact support.');
      return;
    }

    if (isAgent) {
      try {
        const { error: agentError } = await insertAgentWithUniqueSlug(trimmedAgencyName, {
          auth_user_id: data.user.id,
          email_id: emailValue,
          name: trimmedAgencyName,
          known_as: trimmedAgencyName,
          contact_number: trimmedPhone,
        });
        if (agentError) {
          setLoading(false);
          toast.error('Account created, but agent profile setup failed. Please contact support.');
          return;
        }
      } catch (slugErr) {
        setLoading(false);
        if (slugErr instanceof ReservedSlugError) {
          toast.error(
            'That agency name is reserved. Please pick a different name or contact support.'
          );
        } else {
          toast.error('Account created, but slug allocation failed. Please contact support.');
        }
        return;
      }
    }

    if (data.session?.access_token) {
      storeAccessToken(data.session.access_token);
    }

    setLoading(false);
    toast.success('Account created successfully. Please check your email to verify, then sign in.');
    const redirectParam = searchParams.get('redirect');
    const loginHref = redirectParam
      ? `/login?redirect=${encodeURIComponent(redirectParam)}`
      : '/login';
    router.replace(loginHref);
  };

  const handleOAuthSignUp = async (provider: 'google') => {
    setLoading(true);
    // Stash userType so SupabaseSessionSync can recover it even if the OAuth
    // round-trip strips the query param (some providers/middleware do).
    try {
      window.localStorage.setItem('pendingUserType', userType);
    } catch {
      /* localStorage may be unavailable (private mode) — URL param still works */
    }
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

  const errorClass = (key: keyof FormErrors) =>
    errors[key] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '';

  return (
    <div className={`nc-PageSignUp  `}>
      <div className="container mb-24 lg:mb-32">
        <div className="max-w-md mx-auto mt-4 rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-6 md:p-8 space-y-6">
          <h2 className="flex items-center text-3xl leading-[115%] md:text-4xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
            {heading}
          </h2>
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
          <form className="grid grid-cols-1 gap-6" onSubmit={handleSignUp} noValidate>
            {isAgent ? (
              <>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Agency name</span>
                  <Input
                    type="text"
                    autoComplete="organization"
                    className={`mt-1 ${errorClass('agencyName')}`}
                    value={agencyName}
                    onChange={(e) => {
                      setAgencyName(e.target.value);
                      clearError('agencyName');
                    }}
                  />
                  {errors.agencyName ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.agencyName}</span>
                  ) : null}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-neutral-800 dark:text-neutral-200">
                      Contact first name
                    </span>
                    <Input
                      type="text"
                      autoComplete="given-name"
                      className={`mt-1 ${errorClass('contactFirstName')}`}
                      value={contactFirstName}
                      onChange={(e) => {
                        setContactFirstName(e.target.value);
                        clearError('contactFirstName');
                      }}
                    />
                    {errors.contactFirstName ? (
                      <span className="mt-1 text-xs text-red-600 block">
                        {errors.contactFirstName}
                      </span>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-neutral-800 dark:text-neutral-200">
                      Contact last name
                    </span>
                    <Input
                      type="text"
                      autoComplete="family-name"
                      className={`mt-1 ${errorClass('contactLastName')}`}
                      value={contactLastName}
                      onChange={(e) => {
                        setContactLastName(e.target.value);
                        clearError('contactLastName');
                      }}
                    />
                    {errors.contactLastName ? (
                      <span className="mt-1 text-xs text-red-600 block">
                        {errors.contactLastName}
                      </span>
                    ) : null}
                  </label>
                </div>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Phone number</span>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className={`mt-1 ${errorClass('phone')}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError('phone');
                    }}
                  />
                  {errors.phone ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.phone}</span>
                  ) : null}
                </label>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">First name</span>
                  <Input
                    type="text"
                    autoComplete="given-name"
                    className={`mt-1 ${errorClass('firstName')}`}
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clearError('firstName');
                    }}
                  />
                  {errors.firstName ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.firstName}</span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Last name</span>
                  <Input
                    type="text"
                    autoComplete="family-name"
                    className={`mt-1 ${errorClass('lastName')}`}
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      clearError('lastName');
                    }}
                  />
                  {errors.lastName ? (
                    <span className="mt-1 text-xs text-red-600 block">{errors.lastName}</span>
                  ) : null}
                </label>
              </div>
            )}

            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Email address</span>
              <Input
                type="email"
                placeholder="example@example.com"
                autoComplete="email"
                className={`mt-1 ${errorClass('email')}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError('email');
                }}
              />
              {errors.email ? (
                <span className="mt-1 text-xs text-red-600 block">{errors.email}</span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Password</span>
              <Input
                type="password"
                autoComplete="new-password"
                className={`mt-1 ${errorClass('password')}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                  if (errors.confirmPassword && e.target.value === confirmPassword) {
                    clearError('confirmPassword');
                  }
                }}
              />
              {errors.password ? (
                <span className="mt-1 text-xs text-red-600 block">{errors.password}</span>
              ) : (
                <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 block">
                  At least 8 characters, with a letter and a number.
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Confirm password</span>
              <Input
                type="password"
                autoComplete="new-password"
                className={`mt-1 ${errorClass('confirmPassword')}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError('confirmPassword');
                }}
              />
              {errors.confirmPassword ? (
                <span className="mt-1 text-xs text-red-600 block">{errors.confirmPassword}</span>
              ) : null}
            </label>

            <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300 select-none">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-neutral-400 text-primary-600 focus:ring-primary-500"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  clearError('acceptTerms');
                }}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="font-semibold underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="font-semibold underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms ? (
              <span className="-mt-4 text-xs text-red-600 block">{errors.acceptTerms}</span>
            ) : null}

            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </ButtonPrimary>
          </form>

          {/* ==== */}
          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            Already have an account? {` `}
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          </span>
          {!isAgent ? (
            <span className="block text-center text-sm text-neutral-600 dark:text-neutral-400">
              Are you a travel agent?{' '}
              <Link href="/signup?userType=agent" className="font-semibold underline">
                Sign up as an agent
              </Link>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PageSignUp;
