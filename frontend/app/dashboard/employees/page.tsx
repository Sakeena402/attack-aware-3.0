// frontend/app/dashboard/employees/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/app/context/authContext';
import { employeeApi } from '@/app/services/employeeApi';
import type { Employee } from '@/app/services/types';
import { StatCardSkeleton } from '@/components/ui/skeleton-loader';
import {
  Plus, Search, Edit2, Trash2, Shield, AlertTriangle,
  CheckCircle, Download, Mail, Users, UserPlus,
  TrendingUp, Award,
} from 'lucide-react';

const riskLevelColors = {
  high:   { bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30',    icon: AlertTriangle },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Shield },
  low:    { bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30',  icon: CheckCircle },
};

interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Stable SWR key — always the same string so mutate() hits the same cache entry
const EMPLOYEES_KEY = '/employees';

export default function EmployeesPage() {
  const { state }                      = useAuth();
  const { success, error: showError }  = useToast();

  const [searchTerm,        setSearchTerm]        = useState('');
  const [filterDepartment,  setFilterDepartment]  = useState('all');
  const [filterRisk,        setFilterRisk]        = useState('all');
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [isDeleteDialogOpen,setIsDeleteDialogOpen]= useState(false);
  const [selectedEmployee,  setSelectedEmployee]  = useState<Employee | null>(null);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '', email: '', password: '', department: '', role: 'employee', riskLevel: 'low',
  });

  // Single consistent fetcher — apiService already returns the unwrapped `data` field,
  // so res.data here is already { employees: [...], pagination: {} }
  const { data: employeesResponse, isLoading } = useSWR(
    EMPLOYEES_KEY,
    () => employeeApi.getAll(
      state.user?.companyId ? { companyId: state.user.companyId } : undefined
    ),
    { revalidateOnFocus: false }
  );

  const employees = employeesResponse?.employees ?? [];

  const stats = {
    total:     employees.length,
    highRisk:  employees.filter(e => e.riskLevel === 'high').length,
    trained:   employees.filter(e => (e.trainingProgress ?? 0) >= 80).length,
    avgPoints: employees.length
      ? Math.round(employees.reduce((acc, e) => acc + (e.points ?? 0), 0) / employees.length)
      : 0,
  };

  const departments = ['all', ...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch     = emp.name.toLowerCase().includes(searchTerm.toLowerCase())
                           || emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesRisk       = filterRisk === 'all' || emp.riskLevel === filterRisk;
    return matchesSearch && matchesDepartment && matchesRisk;
  });

  const openModal = useCallback((employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({
        name:       employee.name,
        email:      employee.email,
        password:   '',
        department: employee.department ?? '',
        role:       employee.role,
        riskLevel:  (employee.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
      });
    } else {
      setSelectedEmployee(null);
      setFormData({ name: '', email: '', password: '', department: '', role: 'employee', riskLevel: 'low' });
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setFormData({ name: '', email: '', password: '', department: '', role: 'employee', riskLevel: 'low' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedEmployee) {
        const updateData: Partial<Employee> & { password?: string } = {
          name:       formData.name,
          email:      formData.email,
          department: formData.department,
          role:       formData.role as Employee['role'],
          riskLevel:  formData.riskLevel,
        };
        if (formData.password) updateData.password = formData.password;

        await employeeApi.update(selectedEmployee._id, updateData);
        success('Employee Updated', `${formData.name} has been updated successfully`);
      } else {
        if (!formData.password) {
          showError('Error', 'Password is required for new employees');
          setIsSubmitting(false);
          return;
        }
        await employeeApi.create({
          name:             formData.name,
          email:            formData.email,
          password:         formData.password,
          department:       formData.department,
          role:             formData.role as Employee['role'],
          riskLevel:        formData.riskLevel,
          companyId:        state.user?.companyId,
          points:           0,
          badge:            'Rookie',
          trainingProgress: 0,
        });
        success('Employee Added', `${formData.name} has been added successfully`);
      }

      // Invalidate using the exact same key SWR is subscribed to
      mutate(EMPLOYEES_KEY);
      closeModal();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);

    try {
      await employeeApi.delete(selectedEmployee._id);
      success('Employee Removed', `${selectedEmployee.name} has been removed`);
      mutate(EMPLOYEES_KEY);
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleExport = () => {
    if (!employees.length) { showError('Export Failed', 'No employees to export'); return; }

    const headers = ['Name', 'Email', 'Department', 'Role', 'Risk Level', 'Points', 'Training Progress'];
    const csvContent = [
      headers.join(','),
      ...employees.map(e =>
        [e.name, e.email, e.department ?? '', e.role, e.riskLevel ?? 'low', e.points ?? 0, `${e.trainingProgress ?? 0}%`].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
    success('Export Complete', 'Employee data exported successfully');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage employees and track their training progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
            onClick={() => openModal()}
          >
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20"><Users className="w-5 h-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Employees</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.highRisk}</p><p className="text-xs text-muted-foreground">High Risk</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20"><TrendingUp className="w-5 h-5 text-green-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.trained}</p><p className="text-xs text-muted-foreground">Fully Trained</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><Award className="w-5 h-5 text-blue-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.avgPoints}</p><p className="text-xs text-muted-foreground">Avg Points</p></div>
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
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={e => setFilterDepartment(e.target.value)}
          className="px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50 transition-all"
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept === 'all' ? 'All Departments' : dept}</option>
          ))}
        </select>
        <select
          value={filterRisk}
          onChange={e => setFilterRisk(e.target.value)}
          className="px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500/50 transition-all"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
        </select>
      </motion.div>

      {/* Employee Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEmployees.map((employee, idx) => {
              const riskConfig = riskLevelColors[employee.riskLevel as keyof typeof riskLevelColors] ?? riskLevelColors.low;
              const RiskIcon   = riskConfig.icon;

              return (
                <motion.div
                  key={employee._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.03 }}
                  layout
                >
                  <Card className={`p-6 border-2 ${riskConfig.border} bg-gradient-to-br from-muted/30 to-transparent overflow-hidden relative group hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300`}>
                    <div className="absolute top-4 right-4">
                      <div className={`p-2 rounded-lg ${riskConfig.bg} ${riskConfig.text}`}>
                        <RiskIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground truncate">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />{employee.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium text-foreground">{employee.department ?? 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Badge</p>
                          <p className="font-medium text-purple-400">{employee.badge ?? 'Rookie'}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Training Progress</span>
                          <span className="text-foreground font-medium">{employee.trainingProgress ?? 0}%</span>
                        </div>
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${employee.trainingProgress ?? 0}%` }}
                            transition={{ duration: 1, delay: idx * 0.05 }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/10">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-400">{employee.points ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Points</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-400 capitalize">{employee.riskLevel ?? 'low'}</p>
                          <p className="text-xs text-muted-foreground">Risk Level</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(employee)}
                          className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => openDeleteDialog(employee)}
                          className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </motion.div>

      {!isLoading && filteredEmployees.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <UserPlus className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No employees found</p>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterDepartment !== 'all' || filterRisk !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first employee to get started'}
          </p>
          {!searchTerm && filterDepartment === 'all' && filterRisk === 'all' && (
            <Button onClick={() => openModal()} className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Plus className="w-4 h-4 mr-2" /> Add Employee
            </Button>
          )}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
        description={selectedEmployee ? 'Update employee information' : 'Add a new employee to your organization'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <input
              type="text" required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
            <input
              type="email" required value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              placeholder="john@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password{' '}
              {selectedEmployee && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
            </label>
            <input
              type="password" required={!selectedEmployee} value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              placeholder={selectedEmployee ? '(unchanged)' : 'Create password'}
              minLength={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Department</label>
              <input
                type="text" value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                placeholder="Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Risk Level</label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level} type="button"
                  onClick={() => setFormData({ ...formData, riskLevel: level })}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-all capitalize ${
                    formData.riskLevel === level
                      ? level === 'low'   ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : level === 'medium'? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-muted/50 border-purple-500/20 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-purple-500 to-blue-500">
              {isSubmitting ? 'Saving...' : selectedEmployee ? 'Update Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedEmployee(null); }}
        onConfirm={handleDelete}
        title="Remove Employee"
        message={`Are you sure you want to remove ${selectedEmployee?.name}? This action cannot be undone.`}
        confirmText="Remove"
        variant="danger"
        loading={isSubmitting}
      />
    </div>
  );
}
