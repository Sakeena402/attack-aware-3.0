'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { aiScenarioApi, AIScenario } from '@/app/services/aiScenarioApi';
import { AIScenarioReviewModal } from '@/components/ai/AIScenarioReviewModal';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Rocket,
  Shield,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Employee } from '@/app/services/types';

const fetcher = async (url: string) => {
  const response = await apiService.get(url);
  const data = response.data as any;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
};

export default function AIScenariosPage() {
  const { state } = useAuth();
  const { success, error: showError } = useToast();

  const [statusTab, setStatusTab] = useState<'draft' | 'approved' | 'rejected' | 'all'>('draft');
  const [attackFilter, setAttackFilter] = useState<'all' | 'phishing' | 'smishing'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected scenario for Review Modal
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Generate New Scenario Quick Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genParams, setGenParams] = useState<{
    attackType: 'phishing' | 'smishing';
    difficulty: 'easy' | 'medium' | 'hard';
    targetDepartment: string;
    targetEmployeeId: string;
    category: string;
  }>({
    attackType: 'phishing',
    difficulty: 'medium',
    targetDepartment: '',
    targetEmployeeId: '',
    category: '',
  });

  // Fetch scenarios
  const scenariosUrl = state.user?.companyId
    ? `/ai/scenarios?companyId=${state.user.companyId}`
    : '/ai/scenarios';
  const { data: scenarios, isLoading } = useSWR<AIScenario[]>(scenariosUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch employees for targeting
  const employeesUrl = state.user?.companyId
    ? `/employees?companyId=${state.user.companyId}`
    : '/employees';
  const { data: employeesData } = useSWR<Employee[]>(employeesUrl, fetcher, {
    revalidateOnFocus: false,
  });
  const employees = Array.isArray(employeesData) ? employeesData : [];

  const refreshScenarios = () => {
    mutate(scenariosUrl);
  };

  // Generate Scenario Submission
  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const newScenario = await aiScenarioApi.generateScenario({
        attackType: genParams.attackType,
        difficulty: genParams.difficulty,
        targetDepartment: genParams.targetDepartment || undefined,
        targetEmployeeId: genParams.targetEmployeeId || undefined,
        category: genParams.category || undefined,
      });

      success('Generated!', 'AI Scenario generated successfully. Review it below.');
      setIsGenerateModalOpen(false);
      refreshScenarios();

      // Open review modal immediately for the new scenario!
      setSelectedScenario(newScenario);
      setIsReviewOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate scenario';
      showError('Error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter scenarios
  const filteredScenarios = scenarios?.filter((s) => {
    const matchesStatus = statusTab === 'all' || s.status === statusTab;
    const matchesAttack = attackFilter === 'all' || s.attackType === attackFilter;
    
    const content = s.editedContent || s.generatedContent || {};
    const textSearch = [
      content.category,
      content.senderPersona,
      content.subject,
      content.smsText,
      s.targetDepartment,
      typeof s.targetEmployeeId === 'object' ? s.targetEmployeeId?.name : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = !searchTerm || textSearch.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesAttack && matchesSearch;
  }) || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 cyber-glow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-poppins text-foreground">AI Scenarios Library</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Review, edit, and approve department-aware simulation scenarios generated by AI.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns">
            <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
              <Shield className="w-4 h-4 mr-2" />
              Manage Campaigns
            </Button>
          </Link>

          <Button
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Generate AI Scenario
          </Button>
        </div>
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Status Tabs */}
        <div className="flex bg-muted/40 p-1 rounded-xl border border-purple-500/20 overflow-x-auto">
          {(['draft', 'approved', 'rejected', 'all'] as const).map((tab) => {
            const count = scenarios?.filter((s) => tab === 'all' || s.status === tab).length || 0;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  statusTab === tab
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="capitalize">{tab === 'draft' ? 'Drafts (Needs Review)' : tab}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 font-semibold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Attack Type Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="flex border border-purple-500/20 rounded-xl p-1 bg-muted/40">
            {(['all', 'phishing', 'smishing'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setAttackFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  attackFilter === type ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Scenarios Grid / List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse border border-purple-500/10" />
            ))}
          </div>
        ) : filteredScenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredScenarios.map((scenario) => {
                const content = scenario.editedContent || scenario.generatedContent || {};
                const isPhishing = scenario.attackType === 'phishing';

                const targetLabel =
                  typeof scenario.targetEmployeeId === 'object' && scenario.targetEmployeeId?.name
                    ? scenario.targetEmployeeId.name
                    : scenario.targetDepartment
                    ? `Dept: ${scenario.targetDepartment}`
                    : 'Company-wide';

                return (
                  <motion.div
                    key={scenario._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      onClick={() => {
                        setSelectedScenario(scenario);
                        setIsReviewOpen(true);
                      }}
                      className="p-5 border-purple-500/20 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/5 via-slate-900/50 to-blue-500/5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-full space-y-4 shadow-lg group"
                    >
                      <div>
                        {/* Top Card Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isPhishing ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {isPhishing ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                              {content.category || 'General'}
                            </span>
                          </div>

                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize flex items-center gap-1 ${
                            scenario.status === 'approved'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : scenario.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {scenario.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                            {scenario.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {scenario.status === 'draft' && <Clock className="w-3 h-3" />}
                            {scenario.status}
                          </span>
                        </div>

                        {/* Title / Persona */}
                        <h3 className="font-bold text-foreground group-hover:text-purple-300 transition-colors text-base line-clamp-1">
                          {isPhishing ? content.subject || 'Phishing Simulation' : `SMS from ${content.senderPersona}`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Sender: <span className="text-foreground/80 font-medium">{content.senderPersona}</span>
                        </p>

                        {/* Text Snippet */}
                        <p className="text-xs text-muted-foreground/80 mt-3 line-clamp-2 bg-muted/30 p-2.5 rounded-lg border border-purple-500/10 italic">
                          {isPhishing
                            ? (content.bodyHtml || '').replace(/<[^>]*>?/gm, '')
                            : content.smsText || ''}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-purple-500/10">
                        {/* Live Campaign Badge */}
                        {scenario.usedInCampaign ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-xs truncate">
                            <Rocket className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">Used in: <strong>{scenario.usedInCampaign.campaignName}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-purple-400" />
                              {targetLabel}
                            </span>
                            <span className="capitalize font-medium text-slate-400">
                              Diff: {scenario.difficulty}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(scenario.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-purple-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Review <Eye className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/20 border border-purple-500/20 rounded-2xl">
            <Sparkles className="w-12 h-12 mx-auto text-purple-400/50 mb-3" />
            <p className="text-lg font-medium text-foreground">No AI scenarios found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {searchTerm || statusTab !== 'all' || attackFilter !== 'all'
                ? 'Try adjusting your filter criteria.'
                : 'Generate your first AI simulation scenario to get started.'}
            </p>
            <Button onClick={() => setIsGenerateModalOpen(true)} className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Generate AI Scenario
            </Button>
          </div>
        )}
      </motion.div>

      {/* REUSABLE REVIEW MODAL */}
      <AIScenarioReviewModal
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedScenario(null);
        }}
        scenario={selectedScenario}
        onUpdated={refreshScenarios}
        onApproved={() => refreshScenarios()}
        onRegenerateRequest={(s) => {
          setIsReviewOpen(false);
          setGenParams({
            attackType: s.attackType,
            difficulty: (s.difficulty as any) || 'medium',
            targetDepartment: s.targetDepartment || '',
            targetEmployeeId: typeof s.targetEmployeeId === 'object' ? s.targetEmployeeId._id : s.targetEmployeeId || '',
            category: s.generatedContent.category || '',
          });
          setIsGenerateModalOpen(true);
        }}
      />

      {/* QUICK GENERATE PARAMETERS MODAL */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate AI Scenario"
        description="Specify parameters to craft a department-aware simulation scenario using AI."
        size="md"
      >
        <form onSubmit={handleQuickGenerate} className="space-y-5">
          {/* Attack Type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Attack Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['phishing', 'smishing'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGenParams({ ...genParams, attackType: type })}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    genParams.attackType === type
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-muted/40 border-purple-500/20 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type === 'phishing' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setGenParams({ ...genParams, difficulty: diff })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-all ${
                    genParams.difficulty === diff
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 font-bold'
                      : 'bg-muted/40 border-purple-500/20 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Target Department / Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Department (Optional)</label>
              <input
                type="text"
                value={genParams.targetDepartment}
                onChange={(e) => setGenParams({ ...genParams, targetDepartment: e.target.value })}
                placeholder="e.g. Finance, HR, Engineering"
                className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Employee (Optional)</label>
              <select
                value={genParams.targetEmployeeId}
                onChange={(e) => setGenParams({ ...genParams, targetEmployeeId: e.target.value })}
                className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm text-foreground"
              >
                <option value="">-- Any Employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Attack Category */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Attack Category (Optional)</label>
            <input
              type="text"
              value={genParams.category}
              onChange={(e) => setGenParams({ ...genParams, category: e.target.value })}
              placeholder="e.g. Credential Harvesting, HR/Benefits Pretext"
              className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm"
            />
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-3 border-t border-purple-500/20">
            <Button type="button" variant="outline" onClick={() => setIsGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold"
            >
              {isGenerating ? 'Generating Scenario...' : 'Generate Scenario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
