'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Select from '@/shared/Select';
import NcModal from '@/shared/NcModal';
import { supabase } from '@/utils/supabaseClient';

interface AgentProfileEditModalProps {
  agentId?: number;
  initialData: {
    name?: string;
    known_as?: string;
    contact_number?: string;
    alternate_number?: string;
    email_id?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    profile_image?: string | null;
    banner_image?: string | null;
    experience?: string;
    experienceField?: string;
    about_us?: string;
  };
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current.innerHTML);
  };

  const clearFormatting = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Clear inline styles and links.
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);

    // Clear list state if selection is inside a list.
    if (document.queryCommandState('insertUnorderedList')) {
      document.execCommand('insertUnorderedList', false);
    }
    if (document.queryCommandState('insertOrderedList')) {
      document.execCommand('insertOrderedList', false);
    }

    // Normalize to paragraph after clearing.
    document.execCommand('formatBlock', false, 'p');
    onChange(editorRef.current.innerHTML);
  };

  const runToolbarAction = (e: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    // Prevent toolbar click from stealing selection inside contentEditable.
    e.preventDefault();
    action();
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const toolbarButtonClass =
    'rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('formatBlock', 'p'))}
        >
          P
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('formatBlock', 'h2'))}
        >
          H2
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('formatBlock', 'h3'))}
        >
          H3
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('bold'))}
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('italic'))}
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('insertUnorderedList'))}
        >
          Bullets
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, () => runCommand('insertOrderedList'))}
        >
          Numbers
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => runToolbarAction(e, clearFormatting)}
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[180px] w-full rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder || ''}
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Tip: Use headings and bullet points for better readability.
      </p>
    </div>
  );
};

const AgentProfileEditModal = ({ agentId, initialData }: AgentProfileEditModalProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [form, setForm] = useState({
    name: initialData.name || '',
    known_as: initialData.known_as || '',
    contact_number: initialData.contact_number || '',
    alternate_number: initialData.alternate_number || '',
    email_id: initialData.email_id || '',
    address: initialData.address || '',
    city: initialData.city || '',
    state: initialData.state || '',
    country: initialData.country || '',
    profile_image: initialData.profile_image || '',
    banner_image: initialData.banner_image || '',
    experience: initialData.experience || '',
    about_us: initialData.about_us || '',
  });

  const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AGENT_IMAGES_BUCKET || 'agent-images';

  useEffect(() => {
    setForm({
      name: initialData.name || '',
      known_as: initialData.known_as || '',
      contact_number: initialData.contact_number || '',
      alternate_number: initialData.alternate_number || '',
      email_id: initialData.email_id || '',
      address: initialData.address || '',
      city: initialData.city || '',
      state: initialData.state || '',
      country: initialData.country || '',
      profile_image: initialData.profile_image || '',
      banner_image: initialData.banner_image || '',
      experience: initialData.experience || '',
      about_us: initialData.about_us || '',
    });
  }, [initialData]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const uploadImage = async (file: File, folder: 'profile' | 'banner') => {
    if (!agentId) {
      toast.error('Agent identifier missing.');
      return null;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
    const fileName = `${folder}_${agentId}_${Date.now()}.${safeExt}`;
    const filePath = `agents/${agentId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      toast.error('Could not resolve uploaded image URL.');
      return null;
    }

    return publicUrl;
  };

  const validateImageFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxMb = 10;

    if (!allowedTypes.includes(file.type)) {
      toast.error('Use JPG, PNG, WEBP, or GIF image files.');
      return false;
    }

    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxMb}MB.`);
      return false;
    }

    return true;
  };

  const handleImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'profile_image' | 'banner_image'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) return;

    if (target === 'profile_image') setIsUploadingProfile(true);
    if (target === 'banner_image') setIsUploadingBanner(true);

    const url = await uploadImage(file, target === 'profile_image' ? 'profile' : 'banner');

    if (target === 'profile_image') setIsUploadingProfile(false);
    if (target === 'banner_image') setIsUploadingBanner(false);

    if (!url) return;

    setForm((prev) => ({ ...prev, [target]: url }));
    toast.success(`${target === 'profile_image' ? 'Profile' : 'Banner'} image uploaded.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) {
      toast.error('Agent identifier missing.');
      return;
    }

    const experiencePayload = initialData.experienceField
      ? { [initialData.experienceField]: form.experience }
      : {};

    setIsSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({
        name: form.name,
        known_as: form.known_as,
        contact_number: form.contact_number,
        alternate_number: form.alternate_number,
        email_id: form.email_id,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        profile_image: form.profile_image,
        banner_image: form.banner_image,
        ...experiencePayload,
        about_us: form.about_us,
      })
      .eq('id', agentId);

    setIsSaving(false);

    if (error) {
      toast.error(`Failed to update profile: ${error.message}`);
      return;
    }

    toast.success('Profile updated successfully.');
    setIsOpen(false);
    router.refresh();
  };

  return (
    <NcModal
      isOpenProp={isOpen}
      onCloseModal={() => setIsOpen(false)}
      modalTitle="Edit Profile"
      contentExtraClass="max-w-4xl"
      contentPaddingClass="px-4 pb-5 pt-4 md:px-6 md:pb-6"
      renderTrigger={(openModal) => (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            openModal();
          }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-800 shadow-sm"
        >
          <i className="las la-pen"></i>
          Edit Profile
        </button>
      )}
      renderContent={() => (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Legal Name</Label>
              <Input
                name="name"
                className="mt-1.5"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="Enter legal name"
              />
            </div>
            <div>
              <Label>Known As</Label>
              <Input
                name="known_as"
                className="mt-1.5"
                value={form.known_as}
                onChange={handleFieldChange}
                placeholder="Public profile name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Contact Number</Label>
              <Input
                name="contact_number"
                className="mt-1.5"
                value={form.contact_number}
                onChange={handleFieldChange}
                placeholder="Primary phone number"
              />
            </div>
            <div>
              <Label>Alternate Number</Label>
              <Input
                name="alternate_number"
                className="mt-1.5"
                value={form.alternate_number}
                onChange={handleFieldChange}
                placeholder="Backup phone number"
              />
            </div>
          </div>

          <div>
            <Label>Experience (Years)</Label>
            <Input
              name="experience"
              className="mt-1.5"
              value={form.experience}
              onChange={handleFieldChange}
              placeholder="e.g. 10"
            />
            {!initialData.experienceField ? (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Experience field is not configured in backend schema yet.
              </p>
            ) : null}
          </div>

          <div>
            <Label>Email</Label>
            <Input
              name="email_id"
              className="mt-1.5"
              value={form.email_id}
              onChange={handleFieldChange}
              placeholder="Email address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label>Profile Image</Label>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleImagePick(e, 'profile_image')}
                  />
                  {isUploadingProfile ? 'Uploading...' : 'Upload Image'}
                </label>
              </div>
              <div className="mt-1.5 h-24 w-24 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                {form.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.profile_image}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-neutral-500">
                    No image
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label>Banner Image</Label>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleImagePick(e, 'banner_image')}
                  />
                  {isUploadingBanner ? 'Uploading...' : 'Upload Image'}
                </label>
              </div>
              <div className="mt-1.5 h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                {form.banner_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.banner_image}
                    alt="Banner preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-neutral-500">
                    No image
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Supported formats: JPG, PNG, WEBP, GIF up to 10MB. Bucket: {STORAGE_BUCKET}
          </p>

          <div>
            <Label>Address</Label>
            <Input
              name="address"
              className="mt-1.5"
              value={form.address}
              onChange={handleFieldChange}
              placeholder="Street and area"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <Label>City</Label>
              <Input
                name="city"
                className="mt-1.5"
                value={form.city}
                onChange={handleFieldChange}
                placeholder="City"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                name="state"
                className="mt-1.5"
                value={form.state}
                onChange={handleFieldChange}
                placeholder="State"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Select
                name="country"
                className="mt-1.5"
                value={form.country}
                onChange={handleFieldChange}
              >
                {form.country ? <option value={form.country}>{form.country}</option> : null}
                <option value="India">India</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Indonesia">Indonesia</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>About Us</Label>
            <div className="mt-1.5">
              <RichTextEditor
                value={form.about_us}
                onChange={(value) => setForm((prev) => ({ ...prev, about_us: value }))}
                placeholder="Use heading and bullets to describe your services, process, and support."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <ButtonSecondary type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </ButtonPrimary>
          </div>
        </form>
      )}
    />
  );
};

export default AgentProfileEditModal;
