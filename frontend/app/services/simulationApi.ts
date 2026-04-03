


import { apiService } from './api';

export interface SmsTemplate { key: string; name: string; content: string }
export interface VoiceScript { key: string; name: string; content: string }
export interface SimulationStats { total: number; sent?: number; failed?: number; initiated?: number }

export const simulationApi = {
  getSmsTemplates: () => apiService.get<SmsTemplate[]>('/simulations/sms/templates'),
  sendSms: (data: { campaignId: string; userId: string; templateKey: string }) =>
    apiService.post<{ messageSid: string; status: string }>('/simulations/sms/send', data),
  launchSmsCampaign: (campaignId: string, data: { templateKey: string; targetDepartment?: string }) =>
    apiService.post<{ total: number; sent: number; failed: number }>(`/simulations/sms/campaign/${campaignId}`, data),
  getSmsStats: (campaignId: string) => apiService.get<SimulationStats>(`/simulations/sms/stats/${campaignId}`),

  getVoiceScripts: () => apiService.get<VoiceScript[]>('/simulations/voice/scripts'),
  makeCall: (data: { campaignId: string; userId: string; scriptKey: string }) =>
    apiService.post<{ callSid: string; status: string }>('/simulations/voice/call', data),
  launchVoiceCampaign: (campaignId: string, data: { scriptKey: string; targetDepartment?: string }) =>
    apiService.post<{ total: number; initiated: number; failed: number }>(`/simulations/voice/campaign/${campaignId}`, data),
  getVoiceStats: (campaignId: string) => apiService.get<SimulationStats>(`/simulations/voice/stats/${campaignId}`),
};


