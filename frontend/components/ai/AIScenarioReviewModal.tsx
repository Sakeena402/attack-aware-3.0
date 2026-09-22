'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-notification';
import { aiScenarioApi, AIScenario, AIGeneratedContent } from '@/app/services/aiScenarioApi';
import { Sparkles, Mail, MessageSquare, Tag, User, Building2, CheckCircle2, XCircle, Clock, Rocket } from 'lucide-react';

interface AIScenarioReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: AIScenario | null;
  onApproved?: (scenario: AIScenario) => void;
  onUpdated?: () => void;
  onRegenerateRequest?: (scenario: AIScenario) => void;
}

export function AIScenarioReviewModal({
  isOpen,
  onClose,
  scenario,
  onApproved,
  onUpdated,
  onRegenerateRequest,
}: AIScenarioReviewModalProps) {
  const { success, error: showError } = useToast();
  const [formFields, setFormFields] = useState<Partial<AIGeneratedContent>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (scenario) {
      const initialContent = scenario.editedContent || scenario.generatedContent || {};
      setFormFields({
        category: initialContent.category || '',
        senderPersona: initialContent.senderPersona || '',
        subject: initialContent.subject || '',
        bodyHtml: initialContent.bodyHtml || '',
        smsText: initialContent.smsText || '',
      });
      setActiveTab('edit');
    }
  }, [scenario]);

  if (!scenario) return null;

  const targetName =
    typeof scenario.targetEmployeeId === 'object' && scenario.targetEmployeeId?.name
      ? scenario.targetEmployeeId.name
      : scenario.targetDepartment
      ? `Department: ${scenario.targetDepartment}`
      : 'Company-wide';

  const handleUpdateContent = async () => {
    try {
      setIsSaving(true);
      await aiScenarioApi.updateContent(scenario._id, formFields);
      success('Content updated', 'Scenario changes saved as draft.');
      if (onUpdated) onUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update scenario';
      showError('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      // Save any pending edits first
      await aiScenarioApi.updateContent(scenario._id, formFields);
      const approved = await aiScenarioApi.approveScenario(scenario._id);
      
      success('Approved', 'Approved — select it from the template picker when creating a campaign.');
      
      if (onApproved) onApproved(approved);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve scenario';
      showError('Error', msg);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      await aiScenarioApi.rejectScenario(scenario._id);
      success('Scenario rejected', 'The AI scenario has been marked as rejected.');
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject scenario';
      showError('Error', msg);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Scenario Review & Approval"
      description="Review, edit, and approve the generated scenario content."
      size="xl"
    >
      <div className="space-y-6">
        {/* Top Badges Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              {scenario.attackType === 'phishing' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground capitalize text-sm">{scenario.attackType} Scenario</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize border ${
                  scenario.difficulty === 'easy'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : scenario.difficulty === 'hard'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                }`}>
                  {scenario.difficulty}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <User className="w-3 h-3 text-purple-400" /> {targetName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize flex items-center gap-1.5 ${
              scenario.status === 'approved'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : scenario.status === 'rejected'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            }`}>
              {scenario.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {scenario.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
              {scenario.status === 'draft' && <Clock className="w-3.5 h-3.5" />}
              Status: {scenario.status}
            </span>
          </div>
        </div>

        {/* Used in campaign alert badge */}
        {scenario.usedInCampaign && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-xs font-medium">
            <Rocket className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Used in live campaign: <strong className="text-white">{scenario.usedInCampaign.campaignName}</strong> ({scenario.usedInCampaign.status})</span>
          </div>
        )}

        {/* Edit / Preview Tabs Toggle */}
        <div className="flex border-b border-purple-500/20">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'edit'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Edit Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'preview'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Preview
          </button>
        </div>

        {/* TAB 1: EDIT FIELDS */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Attack Category</label>
                <input
                  type="text"
                  value={formFields.category || ''}
                  onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                  placeholder="e.g. IT Support Impersonation"
                  className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Sender Persona Display Name</label>
                <input
                  type="text"
                  value={formFields.senderPersona || ''}
                  onChange={(e) => setFormFields({ ...formFields, senderPersona: e.target.value })}
                  placeholder="e.g. IT Help Desk Support"
                  className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {scenario.attackType === 'phishing' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={formFields.subject || ''}
                    onChange={(e) => setFormFields({ ...formFields, subject: e.target.value })}
                    placeholder="e.g. Urgent: IT Security Update Required"
                    className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">HTML Body Content (Use {'{{trackingUrl}}'} for link)</label>
                  <textarea
                    rows={8}
                    value={formFields.bodyHtml || ''}
                    onChange={(e) => setFormFields({ ...formFields, bodyHtml: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </>
            )}

            {scenario.attackType === 'smishing' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">SMS Text Content (Use {'{{trackingUrl}}'} for link)</label>
                  <span className={`text-xs ${ (formFields.smsText?.length || 0) > 160 ? 'text-red-400 font-bold' : 'text-muted-foreground' }`}>
                    {formFields.smsText?.length || 0} / 160 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formFields.smsText || ''}
                  onChange={(e) => setFormFields({ ...formFields, smsText: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="p-4 bg-slate-950 border border-purple-500/20 rounded-xl space-y-4">
            {scenario.attackType === 'phishing' ? (
              <div className="bg-white text-slate-900 rounded-lg p-6 shadow-inner font-sans max-h-80 overflow-y-auto">
                <div className="border-b border-slate-200 pb-3 mb-4 text-xs text-slate-500">
                  <p><strong>From:</strong> {formFields.senderPersona || 'Sender'} &lt;security-alert@simulation.internal&gt;</p>
                  <p><strong>Subject:</strong> {formFields.subject || '(No Subject)'}</p>
                  <p><strong>Category:</strong> {formFields.category || 'General'}</p>
                </div>
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{
                    __html: (formFields.bodyHtml || '<p>No body content</p>').replace(
                      /\{\{trackingUrl\}\}/g,
                      '#'
                    ),
                  }}
                />
              </div>
            ) : (
              <div className="max-w-xs mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 font-sans shadow-xl">
                <div className="text-center text-xs text-slate-400 border-b border-slate-800 pb-2 mb-3">
                  💬 {formFields.senderPersona || 'SMS Sender'}
                </div>
                <div className="bg-purple-900/40 text-purple-100 p-3 rounded-xl text-sm leading-relaxed border border-purple-500/20">
                  {(formFields.smsText || 'No SMS text').replace(/\{\{trackingUrl\}\}/g, 'http://sim.link/t82')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-purple-500/20">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onRegenerateRequest && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRegenerateRequest(scenario)}
                className="text-xs border-purple-500/30 hover:bg-purple-500/10 flex-1 sm:flex-none"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-400" />
                Regenerate
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleUpdateContent}
              disabled={isSaving}
              className="text-xs border-purple-500/30 hover:bg-purple-500/10 flex-1 sm:flex-none"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || scenario.status === 'rejected'}
              className="text-xs flex-1 sm:flex-none"
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-semibold px-5 py-2.5 w-full sm:w-auto"
          >
            {isApproving ? 'Approving...' : 'Approve & Use in Campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
