'use client';
import React, { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';

const PageContent = () => {
  // Example state, replace with actual agent data fetching and update logic
  const [form, setForm] = useState({
    known_as: '',
    about_us: '',
    address: '',
    contact_number: '',
    email_id: '',
    profile_image: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with actual agent id or logic to get current agent
    const agentId = 1; // Replace with actual agent id
    const { known_as, about_us, address, contact_number, email_id, profile_image } = form;
    const { error } = await supabase
      .from('agents')
      .update({
        known_as,
        about_us,
        address,
        contact_number,
        email_id,
        profile_image,
      })
      .eq('id', agentId);
    if (error) {
      alert('Failed to update agent: ' + error.message);
    } else {
      alert('Agent updated successfully!');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto">
      <h2 className="text-3xl font-semibold">Edit Page Content</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label>Name</Label>
          <Input
            name="name"
            className="mt-1.5"
            defaultValue={form.known_as}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>About Us</Label>
          <Textarea
            name="about_us"
            className="mt-1.5"
            value={form.about_us}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Address</Label>
          <Input
            name="address"
            className="mt-1.5"
            defaultValue={form.address}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Contact Number</Label>
          <Input
            name="contact_number"
            className="mt-1.5"
            value={form.contact_number}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            name="email_id"
            className="mt-1.5"
            defaultValue={form.email_id}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Profile Image URL</Label>
          <Input
            name="profile_image"
            className="mt-1.5"
            defaultValue={form.profile_image}
            onChange={handleChange}
          />
        </div>
        <div className="pt-2">
          <ButtonPrimary type="submit">Save Changes</ButtonPrimary>
        </div>
      </form>
    </div>
  );
};

export default PageContent;
