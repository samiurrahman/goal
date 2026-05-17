'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Label from '@/components/Label';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Input from '@/shared/Input';
import { supabase } from '@/utils/supabaseClient';
import toast from 'react-hot-toast';
import { showApiError } from '@/lib/apiErrors';
import { useSearchParams } from 'next/navigation';

const AccountSettings = () => {
  const searchParams = useSearchParams();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setCurrentEmail(user.email);
    };
    void fetchUser();
  }, []);

  useEffect(() => {
    if (searchParams.get('email_changed') === 'true') {
      toast.success('Email address updated successfully.');
      window.history.replaceState(null, '', '/account-settings');
    }
  }, [searchParams]);

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Please enter a new email address.');
      return;
    }
    if (trimmed === currentEmail.toLowerCase()) {
      toast.error('New email is the same as your current email.');
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailLoading(false);

    if (error) {
      showApiError(error, { message: 'Failed to send verification email. Please try again.' });
      return;
    }

    toast.success(`Verification email sent to ${trimmed}. Please check your inbox and click the link to confirm.`);
    setNewEmail('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordLoading(false);
      toast.error('Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      showApiError(error, { message: 'Failed to update password. Please try again.' });
      return;
    }

    toast.success('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const cardClass =
    'rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 md:p-6';

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className={cardClass}>
        <h3 className="text-lg font-semibold mb-5">Change Password</h3>
        <div className="max-w-xl space-y-5">
          <div>
            <Label>Current password</Label>
            <Input
              type="password"
              className="mt-1.5"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              className="mt-1.5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type="password"
              className="mt-1.5"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="pt-1">
            <ButtonPrimary
              type="button"
              loading={passwordLoading}
              disabled={passwordLoading}
              onClick={handleChangePassword}
            >
              Update password
            </ButtonPrimary>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="text-lg font-semibold mb-5">Change Email</h3>
        <div className="max-w-xl space-y-5">
          <div>
            <Label>Current email</Label>
            <Input type="email" className="mt-1.5" value={currentEmail} readOnly disabled />
          </div>
          <div>
            <Label>New email</Label>
            <Input
              type="email"
              className="mt-1.5"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            A verification link will be sent to the new email. Your login email will only change
            after you click the link.
          </p>
          <div className="pt-1">
            <ButtonPrimary
              type="button"
              loading={emailLoading}
              disabled={emailLoading}
              onClick={handleChangeEmail}
            >
              Change email
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AccountSettingsRoute() {
  return (
    <Suspense fallback={null}>
      <AccountSettings />
    </Suspense>
  );
}
