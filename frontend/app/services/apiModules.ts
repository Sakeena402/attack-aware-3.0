// // apiModules.ts
// import { api } from './api';
// import {
//   Employee,
//   Campaign,
//   DashboardStats,
//   AnalyticsOverview,
//   LeaderboardEntry,
//   SmsTemplate,
//   VoiceScript,
//   SimulationStats,
// } from './api'; // reuse your types
// import { ErrorCodes, ApiError } from './api';

// // ------------------ Auth API ------------------
// export const authApi = {
//   login: (email: string, password: string) =>
//     api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/login', { email, password }, true),

//   register: (data: { name: string; email: string; password: string; role?: string }) =>
//     api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/register', data, true),

//   refresh: (refreshToken: string) =>
//     api.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }, true),

//   me: () => api.get<Employee>('/auth/me'),
// };

// // ------------------ Employee API ------------------
// export const employeeApi = {
//   getAll: () => api.get<Employee[]>('/employees'),
//   getById: (id: string) => api.get<Employee>(`/employees/${id}`),
//   create: (data: Partial<Employee> & { password?: string }) => api.post<Employee>('/employees', data),
//   update: (id: string, data: Partial<Employee> & { password?: string }) => api.put<Employee>(`/employees/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/employees/${id}`),
//   getByDepartment: (department: string) => api.get<Employee[]>(`/employees/department/${department}`),
// };

// // ------------------ Campaign API ------------------
// export const campaignApi = {
//   getAll: () => api.get<Campaign[]>('/campaigns'),
//   getById: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
//   create: (data: Partial<Campaign>) => api.post<Campaign>('/campaigns', data),
//   update: (id: string, data: Partial<Campaign>) => api.put<Campaign>(`/campaigns/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/campaigns/${id}`),
//   launch: (id: string) => api.post<Campaign>(`/campaigns/${id}/launch`, {}),
//   pause: (id: string) => api.post<Campaign>(`/campaigns/${id}/pause`, {}),
// };

// // ------------------ Analytics API ------------------
// export const analyticsApi = {
//   getOverview: () => api.get<AnalyticsOverview>('/analytics/overview'),
//   getDashboard: () => api.get<DashboardStats>('/analytics/dashboard'),
//   getCampaignStats: (campaignId: string) =>
//     api.get<{ clickRate: number; reportRate: number; timeline: { date: string; clicks: number }[] }>(
//       `/analytics/campaign/${campaignId}`
//     ),
//   getGlobal: () => api.get<AnalyticsOverview>('/analytics/global'),
// };

// // ------------------ Leaderboard API ------------------
// export const leaderboardApi = {
//   getAll: (companyId?: string, department?: string) => {
//     const params = new URLSearchParams();
//     if (companyId) params.append('companyId', companyId);
//     if (department) params.append('department', department);
//     return api.get<LeaderboardEntry[]>(`/leaderboard${params.toString() ? `?${params.toString()}` : ''}`);
//   },
//   getByDepartment: (department: string) => api.get<LeaderboardEntry[]>(`/leaderboard/department/${department}`),
//   getUserRank: (userId: string) => api.get<{ rank: number; score: number; percentile: number }>(`/leaderboard/user/${userId}`),
// };

// // ------------------ Company API ------------------
// export const companyApi = {
//   getAll: () => api.get<{ _id: string; companyName: string; industry: string }[]>('/companies'),
//   getById: (id: string) => api.get<{ _id: string; companyName: string; industry: string }>(`/companies/${id}`),
//   create: (data: { companyName: string; industry: string }) => api.post('/companies', data),
//   update: (id: string, data: Partial<{ companyName: string; industry: string }>) => api.put(`/companies/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/companies/${id}`),
// };

// // ------------------ Super Admin API ------------------
// export const superAdminApi = {
//   getCompanies: () => api.get<any[]>('/super-admin/companies'),
//   getCompany: (id: string) => api.get<any>(`/super-admin/companies/${id}`),
//   createCompany: (data: any) => api.post('/super-admin/companies', data),
//   updateCompany: (id: string, data: any) => api.put(`/super-admin/companies/${id}`, data),
//   deleteCompany: (id: string) => api.delete(`/super-admin/companies/${id}`),
//   getGlobalAnalytics: () => api.get<any>('/super-admin/analytics/global'),
//   getAllUsers: () => api.get<any[]>('/super-admin/users'),
//   getSystemHealth: () => api.get<any>('/super-admin/system/health'),
// };

// // ------------------ Contact API ------------------
// export const contactApi = {
//   submit: (data: { name: string; email: string; message: string }) => api.post<{ success: boolean }>('/contact', data, true),
//   getAll: () => api.get<{ _id: string; name: string; email: string; message: string; createdAt: string }[]>('/contact'),
// };

// // ------------------ Simulation API ------------------
// export const simulationApi = {
//   getSmsTemplates: () => api.get<SmsTemplate[]>('/simulations/sms/templates'),
//   sendSms: (data: { campaignId: string; userId: string; templateKey: string }) =>
//     api.post<{ messageSid: string; status: string }>('/simulations/sms/send', data),
//   launchSmsCampaign: (campaignId: string, data: { templateKey: string; targetDepartment?: string }) =>
//     api.post<{ total: number; sent: number; failed: number }>(`/simulations/sms/campaign/${campaignId}`, data),
//   getSmsStats: (campaignId: string) => api.get<SimulationStats>(`/simulations/sms/stats/${campaignId}`),

//   getVoiceScripts: () => api.get<VoiceScript[]>('/simulations/voice/scripts'),
//   makeCall: (data: { campaignId: string; userId: string; scriptKey: string }) =>
//     api.post<{ callSid: string; status: string }>('/simulations/voice/call', data),
//   launchVoiceCampaign: (campaignId: string, data: { scriptKey: string; targetDepartment?: string }) =>
//     api.post<{ total: number; initiated: number; failed: number }>(`/simulations/voice/campaign/${campaignId}`, data),
//   getVoiceStats: (campaignId: string) => api.get<SimulationStats>(`/simulations/voice/stats/${campaignId}`),
// };

// // ------------------ Simulation Analytics ------------------
// export const simulationAnalyticsApi = {
//   getSimulationBreakdown: (companyId?: string) =>
//     api.get<{
//       phishing: { total: number; clicked: number; reported: number; clickRate: number; reportRate: number };
//       smishing: { sent: number; delivered: number; clicked: number; compromised: number; reported: number };
//       vishing: { initiated: number; answered: number; engaged: number; reported: number };
//       summary: { totalSimulations: number; totalCompromised: number; totalReported: number; overallRiskScore: number };
//     }>(`/analytics/simulations${companyId ? `?companyId=${companyId}` : ''}`),

//   getDepartmentRisk: (companyId?: string) =>
//     api.get<{
//       department: string;
//       employees: number;
//       avgRiskScore: number;
//       highRiskCount: number;
//       mediumRiskCount: number;
//       lowRiskCount: number;
//     }[]>(`/analytics/department-risk${companyId ? `?companyId=${companyId}` : ''}`),
// };