'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/utils/supabaseClient';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { Package } from '@/data/types';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

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
    if (id) {
      // Edit existing
      const { error } = await supabase.from('packages').update(form).eq('id', id);
      setLoading(false);
      if (error) {
        toast.error('Failed to update package: ' + error.message);
      } else {
        toast.success('Package updated successfully!');
        router.push('/account-savelists');
      }
    } else {
      // Add new
      const { id, ...formWithoutId } = form;
      const { error } = await supabase.from('packages').insert([{ ...formWithoutId, agent_id: 1 }]);
      setLoading(false);
      if (error) {
        toast.error('Failed to add package: ' + error.message);
      } else {
        toast.success('Package added successfully!');
        setForm(initialState); // Reset form after add
        router.push('/account-savelists');
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
          <Label>Thumbnail URL</Label>
          <Input
            name="thumbnail_url"
            className="mt-1.5"
            value={form.thumbnail_url || ''}
            onChange={handleChange}
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
          <ButtonPrimary type="submit" disabled={loading}>
            {loading ? (id ? 'Saving...' : 'Adding...') : id ? 'Save Changes' : 'Add Package'}
          </ButtonPrimary>
        </div>
      </form>
    </div>
  );
}
