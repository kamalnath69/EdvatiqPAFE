import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import FormField from './ui/FormField';
import { updateMyProfile } from '../services/usersApi';
import { useAuthUser } from '../hooks/useAuthUser';
import { useToast } from '../hooks/useToast';

export default function ProfileSection() {
  const { user, refreshUser } = useAuthUser();
  const { pushToast } = useToast();

  const defaults = useMemo(
    () => ({
      profile_image: user?.profile_image || '',
      full_name: user?.full_name || '',
      dob: user?.dob || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      address: user?.address || '',
      bio: user?.bio || '',
      height_cm: user?.height_cm ?? '',
      weight_kg: user?.weight_kg ?? '',
      dominant_hand: user?.dominant_hand || '',
      experience_level: user?.experience_level || '',
    }),
    [user]
  );

  const form = useForm({ values: defaults });

  async function onSubmit(values) {
    try {
      const payload = {
        ...values,
        height_cm: values.height_cm === '' ? null : Number(values.height_cm),
        weight_kg: values.weight_kg === '' ? null : Number(values.weight_kg),
      };
      await updateMyProfile(payload);
      await refreshUser();
      pushToast({ type: 'success', message: 'Profile updated.' });
    } catch (err) {
      pushToast({ type: 'error', message: err?.response?.data?.detail || 'Failed to update profile.' });
    }
  }

  return (
    <section className="panel enterprise-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">My Profile</h2>
          <p className="panel-subtitle">Keep your athlete profile complete for better coaching and reporting.</p>
        </div>
      </div>
      <div className="profile-hero">
        <img src={defaults.profile_image || 'https://placehold.co/88x88?text=User'} alt="profile" />
        <div>
          <h3>{defaults.full_name || user?.username || 'Athlete'}</h3>
          <p>{user?.role?.replace('_', ' ') || 'User'}</p>
        </div>
      </div>
      <form className="form-grid form-grid-xl" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Profile Image URL">
          <input {...form.register('profile_image')} placeholder="https://..." />
        </FormField>
        <FormField label="Full Name">
          <input {...form.register('full_name')} />
        </FormField>
        <FormField label="Date of Birth">
          <input type="date" {...form.register('dob')} />
        </FormField>
        <FormField label="Email">
          <input type="email" {...form.register('email')} />
        </FormField>
        <FormField label="Phone">
          <input {...form.register('phone')} />
        </FormField>
        <FormField label="Gender">
          <input {...form.register('gender')} />
        </FormField>
        <FormField label="Address">
          <input {...form.register('address')} />
        </FormField>
        <FormField label="Bio">
          <textarea rows={3} {...form.register('bio')} />
        </FormField>
        <FormField label="Height (cm)">
          <input type="number" step="0.1" {...form.register('height_cm')} />
        </FormField>
        <FormField label="Weight (kg)">
          <input type="number" step="0.1" {...form.register('weight_kg')} />
        </FormField>
        <FormField label="Dominant Hand">
          <input {...form.register('dominant_hand')} placeholder="left/right" />
        </FormField>
        <FormField label="Experience Level">
          <input {...form.register('experience_level')} placeholder="beginner/intermediate/advanced" />
        </FormField>
        <div className="sticky-action-row">
          <button type="submit" className="primary-button" disabled={form.formState.isSubmitting}>
            Save Profile
          </button>
        </div>
      </form>
    </section>
  );
}
