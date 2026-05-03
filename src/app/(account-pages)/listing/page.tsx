'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/utils/supabaseClient';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ImageUpload from '@/components/ImageUpload';
import { Package } from '@/data/types';

type DefaultPricing = { people: number; value: number; currency: string };

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
  currency: 'INR',
  default_pricing: { people: 5, value: 0, currency: 'INR' },
  total_duration_days: 0,
  makkah_hotel_name: '',
  madinah_hotel_name: '',
  makkah_hotel_distance_m: 0,
  madinah_hotel_distance_m: 0,
  departure_city: '',
  arrival_city: '',
  thumbnail_url: '',
  slug: '',
  agent_name: '',
  location: '',
};

const parseLegacyDefaultPricing = (pkg: Partial<Package>): DefaultPricing => {
  const currency = String(pkg.currency || 'INR');
  const fallback: DefaultPricing = {
    people: 5,
    value: Number(pkg.price_per_person || 0),
    currency,
  };

  const existing = pkg.default_pricing;
  try {
    const parsedExisting =
      typeof existing === 'string' ? (JSON.parse(existing) as Partial<DefaultPricing>) : existing;
    if (parsedExisting && typeof parsedExisting === 'object') {
      return {
        people: Number(parsedExisting.people || fallback.people),
        value: Number(parsedExisting.value || fallback.value),
        currency: String(parsedExisting.currency || fallback.currency),
      };
    }
  } catch {
    // fall through to legacy sharing_rate parsing
  }

  try {
    const raw = pkg.sharing_rate;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const rates = parsed?.json?.rates ?? parsed?.rates ?? [];
    if (Array.isArray(rates) && rates.length > 0) {
      const selected = rates.find((rate: { default?: boolean }) => rate.default) ?? rates[0];
      return {
        people: Number(selected?.people || fallback.people),
        value: Number(selected?.value || fallback.value),
        currency,
      };
    }
  } catch {
    // ignore malformed legacy data and use fallback
  }

  return fallback;
};

export default function ListingPage() {
  const [form, setForm] = useState<Partial<Package>>(initialState);
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
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
        if (data) {
          const normalized = {
            ...data,
            default_pricing: parseLegacyDefaultPricing(data),
          } as Partial<Package>;
          setForm(normalized);
        }
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

  const handleDefaultPricingChange = (field: 'people' | 'value' | 'currency', value: string) => {
    setForm((prev) => {
      const current = parseLegacyDefaultPricing(prev);
      const next: DefaultPricing = {
        ...current,
        [field]: field === 'currency' ? value : Number(value || 0),
      } as DefaultPricing;

      return {
        ...prev,
        default_pricing: next,
        price_per_person: Number(next.value || 0),
        currency: next.currency,
      };
    });
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

    const normalizedDefaultPricing = parseLegacyDefaultPricing(form);
    const packagePayload = {
      ...form,
      agent_name: agentSlug,
      agent_id: user.id,
      sharing_rate: null,
      default_pricing: normalizedDefaultPricing,
      price_per_person: Number(normalizedDefaultPricing.value || form.price_per_person || 0),
      currency: normalizedDefaultPricing.currency || 'INR',
    };

    if (id) {
      // Edit existing
      const { error } = await supabase.from('packages').update(packagePayload).eq('id', id);
      setLoading(false);
      if (error) {
        toast.error('Failed to update package: ' + error.message);
      } else {
        toast.success('Package updated successfully!');
        router.push('/listed-packages');
      }
    } else {
      // Add new
      const { data: newPackage, error } = await supabase
        .from('packages')
        .insert([packagePayload])
        .select()
        .single();

      if (error || !newPackage) {
        toast.error('Failed to add package: ' + (error?.message ?? 'Unknown error'));
        setLoading(false);
        return;
      }

      // Upload pending image now that we have the real package ID
      if (pendingImageFile) {
        const { uploadImageToStorage } = await import('@/utils/supabaseStorageHelper');
        const result = await uploadImageToStorage(
          pendingImageFile,
          `agents/${user.id}/packages/${newPackage.id}`,
          undefined,
          { fixedFileName: 'image' }
        );
        if (result.url) {
          await supabase
            .from('packages')
            .update({ thumbnail_url: result.url })
            .eq('id', newPackage.id);
        }
      }

      await supabase.from('package_details').insert({
        package_id: newPackage.id,
      });

      setLoading(false);
      toast.success('Package added successfully!');
      setForm(initialState);
      setPendingImageFile(null);
      router.push('/listed-packages');
    }
  };

  const defaultPricingView = parseLegacyDefaultPricing(form);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto">
      <Toaster position="top-center" />
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
            onChange={(e) => handleDefaultPricingChange('currency', e.target.value)}
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
            currentImageUrl={form.thumbnail_url || undefined}
            aspectRatio="wide"
            {...(id
              ? {
                  // Edit mode: upload immediately, package already exists
                  folder: `agents/${authUserId}/packages/${id}`,
                  fixedFileName: 'image',
                  onUploadSuccess: (url) => setForm((prev) => ({ ...prev, thumbnail_url: url })),
                }
              : {
                  // Add mode: defer upload until after package is created
                  onFileSelected: (file) => setPendingImageFile(file),
                })}
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
          <Label>Default Sharing (People)</Label>
          <Input
            className="mt-1.5"
            type="number"
            min={1}
            value={defaultPricingView.people}
            onChange={(e) => handleDefaultPricingChange('people', e.target.value)}
          />
        </div>
        <div>
          <Label>Default Price (Per Person)</Label>
          <Input
            className="mt-1.5"
            type="number"
            min={0}
            value={defaultPricingView.value}
            onChange={(e) => handleDefaultPricingChange('value', e.target.value)}
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
