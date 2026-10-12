import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, Heart, Shield, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export const PatientProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({
    fullName: '',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    emergencyContact: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getPatientProfile();
        if (data) {
          setProfile({
            fullName: data.fullName || user?.fullName || '',
            dateOfBirth: data.dateOfBirth || '1990-01-01',
            gender: data.gender || 'Male',
            bloodGroup: data.bloodGroup || 'O+',
            phone: data.phone || '',
            emergencyContact: data.emergencyContact || '',
            address: data.address || '',
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.updatePatientProfile(profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-navy-900">Personal Health Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Essential clinical demographics utilized for risk calibration and authorized clinician review.
        </p>
      </div>

      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          Health profile demographics updated successfully.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="clinical-card p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email (Account Primary)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={profile.dateOfBirth}
              onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Biological Gender</label>
            <select
              value={profile.gender}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group</label>
            <select
              value={profile.bloodGroup}
              onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value="O+">O Rh-Positive (O+)</option>
              <option value="O-">O Rh-Negative (O-)</option>
              <option value="A+">A Rh-Positive (A+)</option>
              <option value="A-">A Rh-Negative (A-)</option>
              <option value="B+">B Rh-Positive (B+)</option>
              <option value="B-">B Rh-Negative (B-)</option>
              <option value="AB+">AB Rh-Positive (AB+)</option>
              <option value="AB-">AB Rh-Negative (AB-)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1-555-0199"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Emergency Contact Contact & Name</label>
            <input
              type="text"
              value={profile.emergencyContact}
              onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
              placeholder="e.g. Spouse: +1-555-0188"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Residential Address</label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="City, State, Country"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-sm font-bold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
