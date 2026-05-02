'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/utils/supabaseClient';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ImageUpload from '@/components/ImageUpload';
import { Package } from '@/data/types';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const initialState: Partial<Package> = {
  title: '',
  price_per_person: 0,
  currency: '',
  total_duration_days: 0,
  makkah_hotel_name: '',
  madinah_hotel_name: '',
  makkah_hotel_distance_m: 0,
  madinah_hotel_distance_m: 0,
  departure_city: '',
  arrival_city: '',
  sharing_rate: '',
  thumbnail_url: '',
  slug: '',
  agent_name: '',
  location: '',
};

export default function ListingPage() {
  const [form, setForm] = useState<Partial<Package>>(initialState);
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  useEffect(() => {
    const getAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUserId(user?.id || null);
    };
    getAuth();
  }, []);

  useEffect(() => {
    if (id) {
      // Edit mode: fetch existing package
      const fetchPackage = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('packages').select('*').eq('id', id).single();
        if (data) setForm(data);
        setLoading(false);
        if (error) toast.error('Failed to fetch package: ' + error.message);
      };
      fetchPackage();
    } else {
      // Add mode: reset form
      setForm(initialState);
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in as an agent to manage packages.');
      setLoading(false);
      return;
    }

    const { data: agentRowByAuth, error: agentAuthError } = await supabase
      .from('agents')
      .select('id, slug, known_as, email_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (agentAuthError) {
      toast.error('Failed to resolve agent profile: ' + agentAuthError.message);
      setLoading(false);
      return;
    }

    let agentRow = agentRowByAuth;

    if (!agentRow && user.email) {
      const { data: agentRowByEmail, error: agentEmailError } = await supabase
        .from('agents')
        .select('id, slug, known_as, email_id, auth_user_id')
        .eq('email_id', user.email)
        .maybeSingle();

      if (agentEmailError) {
        toast.error('Failed to resolve agent profile by email: ' + agentEmailError.message);
        setLoading(false);
        return;
      }

      if (agentRowByEmail) {
        agentRow = agentRowByEmail;
        if (!agentRowByEmail.auth_user_id) {
          await supabase
            .from('agents')
            .update({ auth_user_id: user.id })
            .eq('id', agentRowByEmail.id);
        }
      }
    }

    if (!agentRow) {
      toast.error('No matching agent profile found for this account.');
      setLoading(false);
      return;
    }

    let agentSlug = (agentRow.slug || '').trim();
    if (!agentSlug) {
      const sourceName = (agentRow.known_as || '').trim() || user.email || user.id;
      agentSlug = slugify(sourceName);
      const { error: slugUpdateError } = await supabase
        .from('agents')
        .update({ slug: agentSlug, auth_user_id: user.id })
        .eq('id', agentRow.id);

      if (slugUpdateError) {
        toast.error('Failed to create agent slug: ' + slugUpdateError.message);
        setLoading(false);
        return;
      }
    }

    if (id) {
      // Edit existing
      const { error } = await supabase
        .from('packages')
        .update({ ...form, agent_name: agentSlug, agent_id: user.id })
        .eq('id', id);
      setLoading(false);
      if (error) {
        toast.error('Failed to update package: ' + error.message);
      } else {
        toast.success('Package updated successfully!');
        router.push('/listed-packages');
      }
    } else {
      // Add new
      const { ...formWithoutId } = form;
      const { data: newPackage, error } = await supabase
        .from('packages')
        .insert([{ ...formWithoutId, agent_id: user.id, agent_name: agentSlug }])
        .select()
        .single();
      if (error) throw error;

      await supabase.from('package_details').insert({
        package_id: newPackage?.id,
      });
      setLoading(false);
      if (error) {
        toast.error('Failed to add package: ' + error);
      } else {
        toast.success('Package added successfully!');
        setForm(initialState);
        router.push('/listed-packages');
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto">
      <Toaster position="top-center" />
      <h2 className="text-3xl font-semibold">{id ? 'Edit Package' : 'Add New Package'}</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label>Title</Label>
          <Input name="title" className="mt-1.5" value={form.title || ''} onChange={handleChange} />
        </div>
        <div>
          <Label>Price Per Person</Label>
          <Input
            name="price_per_person"
            className="mt-1.5"
            type="number"
            value={form.price_per_person ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Input
            name="currency"
            className="mt-1.5"
            value={form.currency || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Total Duration Days</Label>
          <Input
            name="total_duration_days"
            className="mt-1.5"
            type="number"
            value={form.total_duration_days ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Makkah Hotel Name</Label>
          <Input
            name="makkah_hotel_name"
            className="mt-1.5"
            value={form.makkah_hotel_name || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Makkah Hotel Distance (m)</Label>
          <Input
            name="makkah_hotel_distance_m"
            className="mt-1.5"
            type="number"
            value={form.makkah_hotel_distance_m ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Madinah Hotel Name</Label>
          <Input
            name="madinah_hotel_name"
            className="mt-1.5"
            value={form.madinah_hotel_name || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Madinah Hotel Distance (m)</Label>
          <Input
            name="madinah_hotel_distance_m"
            className="mt-1.5"
            type="number"
            value={form.madinah_hotel_distance_m ?? ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Departure City</Label>
          <Input
            name="departure_city"
            className="mt-1.5"
            value={form.departure_city || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Arrival City</Label>
          <Input
            name="arrival_city"
            className="mt-1.5"
            value={form.arrival_city || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <ImageUpload
            label="Package Image"
            folder={`agents/${authUserId}/packages/${id || 'new'}`}
            currentImageUrl={form.thumbnail_url}
            fixedFileName="image"
            onUploadSuccess={(url) => setForm((prev) => ({ ...prev, thumbnail_url: url }))}
            aspectRatio="wide"
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input name="slug" className="mt-1.5" value={form.slug || ''} onChange={handleChange} />
        </div>
        <div>
          <Label>Agent Name</Label>
          <Input
            name="agent_name"
            className="mt-1.5"
            value={form.agent_name || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Location</Label>
          <Input
            name="location"
            className="mt-1.5"
            value={form.location || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>Sharing Rate (JSON string)</Label>
          <Textarea
            name="sharing_rate"
            className="mt-1.5"
            value={form.sharing_rate || ''}
            onChange={handleChange}
            rows={3}
          />
        </div>
        <div className="pt-2">
          <ButtonPrimary type="submit">
            {loading ? (id ? 'Saving...' : 'Adding...') : id ? 'Save Changes' : 'Add Package'}
          </ButtonPrimary>
        </div>
      </form>
    </div>
  );
}
