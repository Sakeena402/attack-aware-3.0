'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/authContext';
import useSWR from 'swr';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-notification';
import { Building2, Plus, Edit2, Trash2, Users, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const fetcher = async (url: string) => {
  const response = await apiService.get(url);
  return response.data.data || response.data;
};

interface Company {
  _id: string;
  id?: string;
  companyName: string;
  industry: string;
  adminId?: any;
  createdAt?: string;
}

export default function CompaniesPage() {
  const { state } = useAuth();
  const { success, error: showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Redirect if not super admin
  if (state.user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-red-500 font-semibold">Access Denied: Super Admin role required</p>
        </Card>
      </div>
    );
  }

  // Fetch companies from super admin endpoint
  const { data: companiesData, isLoading, error, mutate } = useSWR<{ companies: Company[] }>(
    '/super-admin/companies',
    fetcher,
    { revalidateOnFocus: false }
  );

  const companies = companiesData?.companies || [];

  // Filter companies
  const filteredCompanies = companies.filter(company =>
    company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle delete
  const handleDelete = async (companyId: string) => {
    try {
      await api.delete(`/super-admin/companies/${companyId}`);
      success('Company deleted successfully');
      mutate();
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
    } catch (err) {
      showError('Failed to delete company');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              Companies Management
            </h1>
            <p className="text-slate-400 mt-2">Manage all companies on the platform</p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Companies</p>
              <p className="text-2xl font-bold text-foreground mt-1">{companies.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Industries</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {new Set(companies.map(c => c.industry)).size}
              </p>
            </div>
            <Globe className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-foreground mt-1">{companies.filter(c => c._id).length}</p>
            </div>
            <Users className="w-8 h-8 text-cyan-500 opacity-50" />
          </div>
        </Card>
      </motion.div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-foreground placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Companies Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-slate-400">Loading companies...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center bg-red-500/10 border-red-500/20">
            <p className="text-red-400">Failed to load companies</p>
          </Card>
        ) : filteredCompanies.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-400">No companies found</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredCompanies.map((company) => (
              <Card key={company._id} className="p-4 hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{company.companyName}</h3>
                      <p className="text-sm text-slate-400">{company.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCompany(company)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Dialog */}
      {isDeleteDialogOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <Card className="p-6 w-96">
            <h2 className="text-lg font-bold text-foreground mb-4">Delete Company?</h2>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete <strong>{selectedCompany.companyName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => handleDelete(selectedCompany._id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
