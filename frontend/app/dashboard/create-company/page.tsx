'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Building2, Globe, Mail, Users, User as UserIcon,
  Hash, Briefcase, Loader2,
} from 'lucide-react';

interface CompanyForm {
  companyName: string;
  industry: string;
  companyUrl: string;
  companyEmail: string;
  employeeCount: string;
  contactPerson: string;
  taxId: string;
}

const initialForm: CompanyForm = {
  companyName: '',
  industry: '',
  companyUrl: '',
  companyEmail: '',
  employeeCount: '',
  contactPerson: '',
  taxId: '',
};

function FormField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}

export default function CreateCompanyPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: keyof CompanyForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.companyName.trim() || !form.industry.trim()) {
      setError('Company name and industry are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiService.post('/companies', {
        companyName: form.companyName.trim(),
        industry: form.industry.trim(),
        companyUrl: form.companyUrl.trim() || undefined,
        companyEmail: form.companyEmail.trim() || undefined,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
      });

      // Backend issues new cookies with role: 'admin' — refresh auth context
      // so the sidebar/nav immediately reflect the new role.
      await refreshUser();
      router.push('/dashboard/company-profile');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create company. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" />
          Create Your Company
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register your organization to unlock enterprise features. Your company will need
          approval before you can subscribe to a plan.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-slate-800/60 border-slate-700/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              icon={Building2}
              label="Company Name"
              value={form.companyName}
              onChange={(v) => handleChange('companyName', v)}
              placeholder="Acme Corp"
              required
            />
            <FormField
              icon={Briefcase}
              label="Industry"
              value={form.industry}
              onChange={(v) => handleChange('industry', v)}
              placeholder="Retail, Finance, Healthcare..."
              required
            />
            <FormField
              icon={Globe}
              label="Company Website"
              value={form.companyUrl}
              onChange={(v) => handleChange('companyUrl', v)}
              placeholder="https://acmecorp.com"
            />
            <FormField
              icon={Mail}
              label="Company Email"
              value={form.companyEmail}
              onChange={(v) => handleChange('companyEmail', v)}
              placeholder="contact@acmecorp.com"
              type="email"
            />
            <FormField
              icon={Users}
              label="Number of Employees"
              value={form.employeeCount}
              onChange={(v) => handleChange('employeeCount', v.replace(/\D/g, ''))}
              placeholder="25"
              type="text"
            />
            <FormField
              icon={UserIcon}
              label="Contact Person"
              value={form.contactPerson}
              onChange={(v) => handleChange('contactPerson', v)}
              placeholder="Full name of primary contact"
            />
            <FormField
              icon={Hash}
              label="Tax ID"
              value={form.taxId}
              onChange={(v) => handleChange('taxId', v)}
              placeholder="Optional"
            />

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Company...
                </>
              ) : (
                'Create Company'
              )}
            </button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}