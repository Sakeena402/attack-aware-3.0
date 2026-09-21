'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-notification';
import { aiScenarioApi } from '@/app/services/aiScenarioApi';
import { Sparkles, Check, HelpCircle, Calendar, User } from 'lucide-react';

export const FRONTEND_QUIZ_TOPICS = [
  'Phishing Fundamentals',
  'Social Engineering Defense',
  'Secure Password Practices',
  'Safe Browsing Habits',
  'Data Privacy & Handling',
  'Physical Security Awareness',
  'Remote Work Security',
  'Insider Threat Awareness',
] as const;

export type FrontendQuizTopic = (typeof FRONTEND_QUIZ_TOPICS)[number];

export interface SimpleEmployee {
  _id: string;
  name: string;
  email: string;
  department?: string;
}

interface GenerateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: SimpleEmployee[];
  preselectedEmployeeId?: string;
}

export function GenerateQuizModal({
  isOpen,
  onClose,
  employees,
  preselectedEmployeeId,
}: GenerateQuizModalProps) {
  const { success, error: showError } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    preselectedEmployeeId || (employees[0]?._id ?? '')
  );
  const [topicMode, setTopicMode] = useState<'manual' | 'auto'>('manual');
  const [selectedTopic, setSelectedTopic] = useState<FrontendQuizTopic>(FRONTEND_QUIZ_TOPICS[0]);
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      showError('Please select an employee.');
      return;
    }

    if (topicMode === 'manual' && !selectedTopic) {
      showError('Please select a quiz topic.');
      return;
    }

    setIsSubmitting(true);

    try {
      await aiScenarioApi.generateQuizForEmployee({
        employeeId: selectedEmployeeId,
        topicMode,
        topic: topicMode === 'manual' ? selectedTopic : undefined,
        dueInDays,
      });

      success(
        'Generating quiz... you will be notified in Messages when it is ready!',
        'Job has been queued in background.'
      );

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue quiz generation';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate AI Quiz" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Employee Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Target Employee
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            required
            className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
          >
            {employees.length === 0 ? (
              <option value="">No employees available</option>
            ) : (
              employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.email}) {emp.department ? `- ${emp.department}` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Topic Mode Segmented Control */}
        <div>
          <label className="block text-sm font-medium mb-2">Topic Selection Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTopicMode('manual')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                topicMode === 'manual'
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-muted/50 border border-purple-500/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              Pick a Topic
            </button>
            <button
              type="button"
              onClick={() => setTopicMode('auto')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                topicMode === 'auto'
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-muted/50 border border-purple-500/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400" /> Let AI Decide
            </button>
          </div>
        </div>

        {/* Topic Choice Chips (when "Pick a Topic" active) */}
        {topicMode === 'manual' ? (
          <div>
            <label className="block text-sm font-medium mb-2">Select Topic</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {FRONTEND_QUIZ_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-medium'
                        : 'border-purple-500/20 bg-muted/30 text-muted-foreground hover:border-purple-500/40 hover:text-foreground'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{topic}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Explanatory card (when "Let AI Decide" active) */
          <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-semibold text-purple-300 mb-1">Adaptive AI Topic Selection</p>
              <p>
                AI will generate a personalized quiz based on this employee's recent activity, simulation failures, and past quiz performance history to focus on their weakest risk areas.
              </p>
            </div>
          </div>
        )}

        {/* Due Date in Days */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" /> Due Date (Days from today)
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={dueInDays}
            onChange={(e) => setDueInDays(parseInt(e.target.value || '14', 10))}
            className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-purple-500/20">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || employees.length === 0}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting ? 'Queueing...' : 'Generate & Assign Quiz'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
