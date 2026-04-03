// frontend/app/dashboard/campaigns/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/app/context/authContext';
import { campaignApi } from '@/app/services/campaignApi';
import { employeeApi } from '@/app/services/employeeApi';
import { Campaign } from '@/app/services/types';
import { StatCardSkeleton } from '@/components/ui/skeleton-loader';
import {
  Plus, Search, Edit2, Trash2, PlayCircle, PauseCircle, Eye,
  Mail, MessageSquare, Phone, Zap, Target, TrendingUp,
  Calendar, Users, CheckCircle, Clock,
} from 'lucide-react';

const typeIcons = {
  phishing: Mail,
  smishing: MessageSquare,
  vishing:  Phone,
};

const typeColors = {
  phishing: 'bg-red-500/20 text-red-400 border-red-500/30',
  smishing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  vishing:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors = {
  active:    'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  draft:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
  paused:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const smsTemplates = [
  { key: 'bank_alert',        name: 'Bank Security Alert',   description: 'Fake bank suspicious activity notification' },
  { key: 'package_delivery',  name: 'Package Delivery',      description: 'Fake delivery pending confirmation' },
  { key: 'hr_benefits',       name: 'HR Benefits Update',    description: 'Fake HR benefits enrollment expiring' },
  { key: 'password_reset',    name: 'Password Reset',        description: 'Fake password reset request warning' },
  { key: 'prize_winner',      name: 'Prize Winner',          description: 'Fake prize/gift card claim' },
  { key: 'tax_refund',        name: 'Tax Refund',            description: 'Fake IRS tax refund notification' },
];

const voiceScripts = [
  { key: 'bank_verification', name: 'Bank Verification', description: 'Fake call from financial institution' },
  { key: 'it_support',        name: 'IT Support Call',   description: 'Fake IT department security issue call' },
  { key: 'insurance_claim',   name: 'Insurance Claim',   description: 'Fake insurance policy update call' },
];

interface CampaignFormData {
  campaignName:     string;
  type:             'phishing' | 'smishing' | 'vishing';
  startDate:        string;
  endDate:          string;
  targetEmployees:  string[];
  targetDepartments:string[];
  emailTemplate:    string;
  smsTemplate:      string;
  voiceScript:      string;
  description:      string;
}

const EMPTY_FORM: CampaignFormData = {
  campaignName: '', type: 'phishing', startDate: '', endDate: '',
  targetEmployees: [], targetDepartments: [],
  emailTemplate: '', smsTemplate: 'bank_alert',
  voiceScript: 'bank_verification', description: '',
};

// SWR key factories — stable strings so mutate() hits the right cache entry
const campaignKey = (companyId?: string) =>
  companyId ? `campaigns:${companyId}` : 'campaigns';

export default function CampaignsPage() {
  const { state }                     = useAuth();
  const { success, error: showError } = useToast();

  const [searchTerm,         setSearchTerm]         = useState('');
  const [filterType,         setFilterType]         = useState('all');
  const [filterStatus,       setFilterStatus]       = useState('all');
  const [isModalOpen,        setIsModalOpen]        = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewModalOpen,    setIsViewModalOpen]    = useState(false);
  const [selectedCampaign,   setSelectedCampaign]   = useState<Campaign | null>(null);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [formData,           setFormData]           = useState<CampaignFormData>(EMPTY_FORM);

  // Campaigns
  const { data: campaigns = [], isLoading } = useSWR<Campaign[]>(
    campaignKey(state.user?.companyId),
    () => campaignApi.getAll(state.user?.companyId),
    { revalidateOnFocus: false }
  );

  // Employees — for target selection in the form
  const { data: employeesResponse } = useSWR(
    state.user?.companyId ? `employees-campaigns:${state.user.companyId}` : null,
    () => employeeApi.getAll(
      state.user?.companyId ? { companyId: state.user.companyId, limit: 200 } : undefined
    ),
    { revalidateOnFocus: false }
  );
  const employees = employeesResponse?.employees ?? [];

  const refresh = () => mutate(campaignKey(state.user?.companyId));

  const stats = {
    total:         campaigns.length,
    active:        campaigns.filter(c => c.status === 'active').length,
    avgClickRate:  campaigns.length
      ? (campaigns.reduce((acc, c) => acc + (c.clickRate ?? 0), 0) / campaigns.length).toFixed(1)
      : '0',
    avgReportRate: campaigns.length
      ? (campaigns.reduce((acc, c) => acc + (c.reportRate ?? 0), 0) / campaigns.length).toFixed(1)
      : '0',
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch  = c.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType    = filterType   === 'all' || c.type   === filterType;
    const matchesStatus  = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const openModal = useCallback((campaign?: Campaign) => {
    if (campaign) {
      setSelectedCampaign(campaign);
      setFormData({
        campaignName:      campaign.campaignName,
        type:              campaign.type,
        startDate:         campaign.startDate?.split('T')[0] ?? '',
        endDate:           campaign.endDate?.split('T')[0] ?? '',
        targetEmployees:   campaign.targetEmployees ?? [],
        targetDepartments: campaign.targetDepartments ?? [],
        emailTemplate:     campaign.emailTemplate ?? '',
        smsTemplate:       campaign.smsTemplate ?? 'bank_alert',
        voiceScript:       campaign.voiceScript ?? 'bank_verification',
        description:       campaign.description ?? '',
      });
    } else {
      setSelectedCampaign(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedCampaign) {
        await campaignApi.update(selectedCampaign._id, {
          ...formData,
          companyId: state.user?.companyId,
        });
        success('Campaign Updated', `${formData.campaignName} has been updated`);
      } else {
        await campaignApi.create({
          ...formData,
          companyId: state.user?.companyId,
          createdBy: state.user?.id,
          status: 'draft',
          clickRate: 0,
          reportRate: 0,
        });
        success('Campaign Created', `${formData.campaignName} has been created`);
      }
      refresh();
      closeModal();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (campaign: Campaign, newStatus: 'active' | 'paused') => {
    try {
      if (newStatus === 'active') {
        await campaignApi.launch(campaign._id);
        success('Campaign Launched', `${campaign.campaignName} is now active`);
      } else {
        await campaignApi.pause(campaign._id);
        success('Campaign Paused', `${campaign.campaignName} has been paused`);
      }
      refresh();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    setIsSubmitting(true);
    try {
      await campaignApi.delete(selectedCampaign._id);
      success('Campaign Deleted', `${selectedCampaign.campaignName} has been removed`);
      refresh();
      setIsDeleteDialogOpen(false);
      setSelectedCampaign(null);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      targetEmployees: prev.targetEmployees.includes(id)
        ? prev.targetEmployees.filter(e => e !== id)
        : [...prev.targetEmployees, id],
    }));
  };

  const selectAllEmployees = () => {
    setFormData(prev => ({
      ...prev,
      targetEmployees: prev.targetEmployees.length === employees.length
        ? []
        : employees.map(e => e._id),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your security awareness campaigns</p>
        </div>
        <Button
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
      >
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20"><Zap className="w-5 h-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Campaigns</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20"><PlayCircle className="w-5 h-5 text-green-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20"><Target className="w-5 h-5 text-red-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.avgClickRate}%</p><p className="text-xs text-muted-foreground">Avg Click Rate</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.avgReportRate}%</p><p className="text-xs text-muted-foreground">Avg Report Rate</p></div>
              </div>
            </Card>
          </>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 flex-wrap"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      >
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search campaigns..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'phishing', 'smishing', 'vishing'].map(type => (
            <button
              key={type} onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterType === type
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                  : 'bg-muted/50 border border-purple-500/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20 bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Campaign</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Targets</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Click Rate</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Report Rate</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-purple-500/10">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <AnimatePresence>
                    {filteredCampaigns.map((campaign, idx) => {
                      const TypeIcon = typeIcons[campaign.type as keyof typeof typeIcons] ?? Mail;
                      return (
                        <motion.tr
                          key={campaign._id}
                          className="border-b border-purple-500/10 hover:bg-muted/30 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${typeColors[campaign.type as keyof typeof typeColors] ?? 'bg-purple-500/20'}`}>
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{campaign.campaignName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'Not set'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${typeColors[campaign.type as keyof typeof typeColors] ?? ''}`}>
                              {campaign.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${statusColors[campaign.status as keyof typeof statusColors] ?? ''}`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {campaign.targetEmployees?.length ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(campaign.clickRate ?? 0, 100)}%` }}
                                  transition={{ duration: 1, delay: idx * 0.05 }}
                                />
                              </div>
                              <span className="text-sm font-medium text-orange-400 w-12">
                                {campaign.clickRate?.toFixed(1) ?? 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(campaign.reportRate ?? 0, 100)}%` }}
                                  transition={{ duration: 1, delay: idx * 0.05 }}
                                />
                              </div>
                              <span className="text-sm font-medium text-green-400 w-12">
                                {campaign.reportRate?.toFixed(1) ?? 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {campaign.status === 'active' && (
                                <button onClick={() => handleStatusChange(campaign, 'paused')} className="p-2 hover:bg-yellow-500/20 rounded-lg transition-all" title="Pause">
                                  <PauseCircle className="w-4 h-4 text-yellow-400" />
                                </button>
                              )}
                              {(campaign.status === 'draft' || campaign.status === 'paused') && (
                                <button onClick={() => handleStatusChange(campaign, 'active')} className="p-2 hover:bg-green-500/20 rounded-lg transition-all" title="Launch">
                                  <PlayCircle className="w-4 h-4 text-green-400" />
                                </button>
                              )}
                              <button onClick={() => { setSelectedCampaign(campaign); setIsViewModalOpen(true); }} className="p-2 hover:bg-blue-500/20 rounded-lg transition-all" title="View">
                                <Eye className="w-4 h-4 text-blue-400" />
                              </button>
                              <button onClick={() => openModal(campaign)} className="p-2 hover:bg-purple-500/20 rounded-lg transition-all" title="Edit">
                                <Edit2 className="w-4 h-4 text-purple-400" />
                              </button>
                              <button
                                onClick={() => { setSelectedCampaign(campaign); setIsDeleteDialogOpen(true); }}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-all" title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {!isLoading && filteredCampaigns.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Zap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No campaigns found</p>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters' : 'Create your first campaign to get started'}
          </p>
          {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
            <Button onClick={() => openModal()} className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          )}
        </motion.div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen} onClose={closeModal}
        title={selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
        description={selectedCampaign ? 'Update campaign details' : 'Configure your security awareness campaign'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Campaign Name</label>
            <input
              type="text" required value={formData.campaignName}
              onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
              className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              placeholder="Q1 Phishing Awareness"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Campaign Type</label>
            <div className="flex gap-3">
              {(['phishing', 'smishing', 'vishing'] as const).map(type => {
                const Icon = typeIcons[type];
                return (
                  <button
                    key={type} type="button" onClick={() => setFormData({ ...formData, type })}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      formData.type === type ? typeColors[type] : 'bg-muted/50 border-purple-500/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="capitalize text-sm font-medium">{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date" required value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
              <input
                type="date" required value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Target Employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Target Employees</label>
              <button type="button" onClick={selectAllEmployees} className="text-xs text-purple-400 hover:text-purple-300">
                {formData.targetEmployees.length === employees.length && employees.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto border border-purple-500/20 rounded-lg p-2 space-y-1">
              {employees.length > 0 ? employees.map(emp => (
                <label key={emp._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.targetEmployees.includes(emp._id)}
                    onChange={() => toggleEmployee(emp._id)}
                    className="w-4 h-4 rounded border-purple-500/30 text-purple-500 focus:ring-purple-500/50"
                  />
                  <span className="text-sm text-foreground">{emp.name}</span>
                  <span className="text-xs text-muted-foreground">({emp.department ?? 'N/A'})</span>
                </label>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formData.targetEmployees.length} employee(s) selected</p>
          </div>

          {formData.type === 'smishing' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">SMS Template</label>
              <div className="grid grid-cols-2 gap-2">
                {smsTemplates.map(t => (
                  <button
                    key={t.key} type="button" onClick={() => setFormData({ ...formData, smsTemplate: t.key })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.smsTemplate === t.key
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                        : 'bg-muted/50 border-purple-500/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs opacity-70 mt-1">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {formData.type === 'vishing' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Voice Script</label>
              <div className="space-y-2">
                {voiceScripts.map(s => (
                  <button
                    key={s.key} type="button" onClick={() => setFormData({ ...formData, voiceScript: s.key })}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      formData.voiceScript === s.key
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-muted/50 border-purple-500/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="block text-xs opacity-70 mt-1">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {formData.type === 'phishing' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Template (Optional)</label>
              <textarea
                value={formData.emailTemplate}
                onChange={e => setFormData({ ...formData, emailTemplate: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
                placeholder="Enter your phishing email template..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
              placeholder="Brief description of this campaign..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-purple-500 to-blue-500">
              {isSubmitting ? 'Saving...' : selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedCampaign(null); }}
        title={selectedCampaign?.campaignName ?? 'Campaign Details'}
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Type',       value: selectedCampaign.type },
                { label: 'Status',     value: selectedCampaign.status },
                { label: 'Start Date', value: selectedCampaign.startDate ? new Date(selectedCampaign.startDate).toLocaleDateString() : 'Not set' },
                { label: 'End Date',   value: selectedCampaign.endDate   ? new Date(selectedCampaign.endDate).toLocaleDateString()   : 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-medium text-foreground capitalize">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-purple-500/10 text-center">
                <p className="text-2xl font-bold text-purple-400">{selectedCampaign.targetEmployees?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Target Employees</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 text-center">
                <p className="text-2xl font-bold text-red-400">{selectedCampaign.clickRate?.toFixed(1) ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Click Rate</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 text-center">
                <p className="text-2xl font-bold text-green-400">{selectedCampaign.reportRate?.toFixed(1) ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Report Rate</p>
              </div>
            </div>
            {selectedCampaign.emailTemplate && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Email Template</p>
                <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedCampaign.emailTemplate}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsViewModalOpen(false); openModal(selectedCampaign); }}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button onClick={() => { setIsViewModalOpen(false); setSelectedCampaign(null); }} className="bg-gradient-to-r from-purple-500 to-blue-500">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedCampaign(null); }}
        onConfirm={handleDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${selectedCampaign?.campaignName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isSubmitting}
      />
    </div>
  );
}