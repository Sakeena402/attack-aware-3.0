'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-notification';
import { aiScenarioApi } from '@/app/services/aiScenarioApi';
import { Sparkles, Check, HelpCircle, Calendar, Users, Search } from 'lucide-react';

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

export function GenerateQuizModal({ isOpen, onClose, employees, preselectedEmployeeId }: GenerateQuizModalProps) {
  const { success, error: showError } = useToast();

  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [topicMode, setTopicMode] = useState<'manual' | 'auto'>('manual');
  const [selectedTopic, setSelectedTopic] = useState<FrontendQuizTopic>(FRONTEND_QUIZ_TOPICS[0]);
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const safeEmployees = useMemo(() => {
    if (Array.isArray(employees)) return employees;
    if (employees && typeof employees === 'object' && Array.isArray((employees as { employees?: SimpleEmployee[] }).employees)) {
      return (employees as { employees: SimpleEmployee[] }).employees;
    }
    return [];
  }, [employees]);

  const filteredEmployees = useMemo(
    () =>
      safeEmployees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()) ||
          (e.department ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [safeEmployees, search]
  );

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e._id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (targetMode === 'specific' && selectedIds.size === 0) {
      showError('Please select at least one employee.');
      return;
    }

    if (topicMode === 'manual' && !selectedTopic) {
      showError('Please select a quiz topic.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await aiScenarioApi.generateQuizForEmployees({
        employeeIds: targetMode === 'all' ? 'all' : Array.from(selectedIds),
        topicMode,
        topic: topicMode === 'manual' ? selectedTopic : undefined,
        dueInDays,
      });

      success(
        `Generating ${result.count} quiz${result.count !== 1 ? 'zes' : ''}...`,
        'You will be notified in Messages when each quiz is ready!'
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue quiz generation';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetLabel =
    targetMode === 'all'
      ? `All Employees (${safeEmployees.length})`
      : selectedIds.size === 0
      ? 'No employees selected'
      : `${selectedIds.size} employee${selectedIds.size !== 1 ? 's' : ''} selected`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate AI Quiz" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> Target Audience
          </label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTargetMode('all')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                targetMode === 'all'
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-muted/50 border border-purple-500/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Employees
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('specific')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                targetMode === 'specific'
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-muted/50 border border-purple-500/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              Select Specific
            </button>
          </div>

          {targetMode === 'specific' && (
            <div className="rounded-xl border border-purple-500/20 bg-muted/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/10">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-purple-400 hover:text-purple-300 whitespace-nowrap flex-shrink-0"
                >
                  {selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-purple-500/10">
                {filteredEmployees.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No employees found</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const checked = selectedIds.has(emp._id);
                    return (
                      <label
                        key={emp._id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? 'bg-purple-500/10' : 'hover:bg-muted/40'
                        }`}
                        onClick={() => toggleEmployee(emp._id)}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            checked
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-purple-500/30 bg-transparent'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.email}{emp.department ? `  ${emp.department}` : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="px-3 py-2 border-t border-purple-500/10 text-xs text-muted-foreground">
                {targetLabel}
              </div>
            </div>
          )}

          {targetMode === 'all' && (
            <p className="text-xs text-muted-foreground px-1">
              One quiz will be generated and assigned to each of the{' '}
              <span className="text-purple-300 font-medium">{safeEmployees.length}</span> employees in your company.
            </p>
          )}
        </div>

        {/* Topic Mode */}
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

        {topicMode === 'manual' ? (
          <div>
            <label className="block text-sm font-medium mb-2">Select Topic</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
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
          <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-semibold text-purple-300 mb-1">Adaptive AI Topic Selection</p>
              <p>
                AI will generate a personalized quiz per employee based on their recent activity,
                simulation failures, and past quiz performance to focus on their weakest risk areas.
              </p>
            </div>
          </div>
        )}

        {/* Due Date */}
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
            disabled={
              isSubmitting ||
              safeEmployees.length === 0 ||
              (targetMode === 'specific' && selectedIds.size === 0)
            }
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting
              ? 'Queueing...'
              : `Generate & Assign${targetMode === 'all' ? ' to All' : selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
