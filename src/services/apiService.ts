import { 
  BmdcLesson, 
  QuestionBankItem, 
  ClinicalCase, 
  StudentProgress, 
  UserRole,
  UserAccount,
  MistakeEntry,
  SpacedRepetitionCard
} from '../types';
import { StorageService } from './storageService';
import { AuthService } from './authService';
import { 
  CARDIOVASCULAR_PILOT_LESSONS, 
  CARDIOVASCULAR_PILOT_QUESTIONS, 
  CARDIOVASCULAR_PILOT_CASES 
} from '../data/cardiovascularPilotData';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/**
 * Safely fetches and parses JSON only if Content-Type includes application/json and response is OK.
 * Prevents "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" crashes on static SPA hosts.
 */
async function safeJsonFetch<T>(url: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.toLowerCase().includes('application/json')) {
      const text = await res.text();
      if (!text || text.trim().startsWith('<') || text.trim().toLowerCase().startsWith('<!doctype')) {
        return null;
      }
      return JSON.parse(text) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export class ApiService {
  private static isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Server health check
  static async checkHealth(): Promise<{ status: string; version: string; database: string }> {
    const data = await safeJsonFetch<{ status: string; version: string; database: string }>(`${API_BASE}/health`);
    if (data) return data;
    return { status: 'offline_mode', version: '2.0.0-local', database: 'browser_storage' };
  }

  // Authentication & Role
  static async getCurrentUser(): Promise<UserAccount> {
    const session = AuthService.getSession();
    const token = session?.access_token;

    if (token) {
      const data = await safeJsonFetch<UserAccount>(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data) return data;
    }

    const authUser = AuthService.getCurrentUser();
    const profile = AuthService.getProfile();
    const role = AuthService.getRole();
    const progress = StorageService.getProgress();

    return {
      id: authUser?.id || progress.userId,
      name: profile?.full_name || authUser?.email?.split('@')[0] || progress.name,
      email: authUser?.email || progress.email,
      role: role,
      currentPhase: profile?.mbbs_phase || progress.currentPhase,
      institution: profile?.institution || progress.university
    };
  }

  static async setRole(role: UserRole): Promise<UserRole> {
    // Browser role switching is prohibited. Role is derived from verified Supabase session.
    return AuthService.getRole();
  }

  // Lessons & Curriculum
  static async getLessons(filter?: { phase?: string; system?: string }): Promise<BmdcLesson[]> {
    const params = new URLSearchParams();
    if (filter?.phase) params.append('phase', filter.phase);
    if (filter?.system) params.append('system', filter.system);
    
    const data = await safeJsonFetch<BmdcLesson[]>(`${API_BASE}/lessons?${params.toString()}`);
    if (Array.isArray(data) && data.length > 0) return data;

    let results = [...CARDIOVASCULAR_PILOT_LESSONS];
    if (filter?.phase) {
      results = results.filter((l) => l.phase.toLowerCase().includes(filter.phase!.toLowerCase()));
    }
    if (filter?.system) {
      results = results.filter((l) => l.system === filter.system);
    }
    return results;
  }

  static async getLessonById(id: string): Promise<BmdcLesson | undefined> {
    const data = await safeJsonFetch<BmdcLesson>(`${API_BASE}/lessons/${id}`);
    if (data) return data;
    return CARDIOVASCULAR_PILOT_LESSONS.find((l) => l.id === id);
  }

  // Questions & Assessment
  static async getQuestions(topic?: string, phase?: string): Promise<QuestionBankItem[]> {
    const data = await safeJsonFetch<QuestionBankItem[]>(`${API_BASE}/questions`);
    if (Array.isArray(data) && data.length > 0) return data;
    return CARDIOVASCULAR_PILOT_QUESTIONS;
  }

  // Clinical Cases
  static async getCases(): Promise<ClinicalCase[]> {
    const data = await safeJsonFetch<ClinicalCase[]>(`${API_BASE}/cases`);
    if (Array.isArray(data) && data.length > 0) return data;
    return CARDIOVASCULAR_PILOT_CASES;
  }

  // Progress & Analytics
  static async getProgress(): Promise<StudentProgress> {
    const data = await safeJsonFetch<StudentProgress>(`${API_BASE}/progress`);
    if (data) return data;
    return StorageService.getProgress();
  }

  static async updateProgress(progress: StudentProgress): Promise<void> {
    StorageService.saveProgress(progress);
    try {
      await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress)
      });
    } catch {
      // Sync queue handled locally
    }
  }

  // AI Tutor RAG
  static async askAiTutor(query: string, language: 'en' | 'bn' = 'en'): Promise<{
    answer: string;
    citations: string[];
    visualCascade?: string[];
    isConfigured: boolean;
  }> {
    try {
      const data = await safeJsonFetch<{
        answer: string;
        citations: string[];
        visualCascade?: string[];
        isConfigured: boolean;
      }>(`${API_BASE}/ai-tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language })
      });
      if (data) return data;
      throw new Error('AI API unavailable');
    } catch (e) {
      // Deterministic evidence-grounded search over published lessons
      const q = query.toLowerCase();
      const matchedLesson = CARDIOVASCULAR_PILOT_LESSONS.find((l) =>
        l.title.toLowerCase().includes(q) ||
        l.stages.learn.detailedContentEn.toLowerCase().includes(q) ||
        l.learningObjectives.some((obj) => obj.toLowerCase().includes(q))
      );

      if (matchedLesson) {
        return {
          answer: language === 'bn'
            ? `**${matchedLesson.titleBn || matchedLesson.title}** সম্পর্কিত অনুমোদিত পাঠ্যক্রম তথ্য:\n\n${matchedLesson.stages.learn.overviewBn}\n\n**মূল শিক্ষণীয় বিষয় (Key Points):**\n${matchedLesson.stages.learn.keyTakeaways.map(p => `• ${p}`).join('\n')}`
            : `**From Verified Lesson: ${matchedLesson.title}**\n\n${matchedLesson.stages.learn.overviewEn}\n\n**Key Evidence Takeaways:**\n${matchedLesson.stages.learn.keyTakeaways.map(p => `• ${p}`).join('\n')}`,
          citations: matchedLesson.references,
          visualCascade: [
            '1. Primary Anatomical/Physiological Substrate',
            '2. Pathophysiological Alteration & Cellular Changes',
            '3. Hemodynamic / Clinical Manifestation',
            '4. Confirmatory Diagnostic Workup',
            '5. Guideline-Directed Clinical Management'
          ],
          isConfigured: false // Highlights that live Gemini API key is not yet set on server
        };
      }

      return {
        answer: language === 'bn'
          ? 'এই বিষয়ে অনুমোদিত পাঠ্যক্রমে সরাসরি তথ্য পাওয়া যায়নি। অনুগ্রহ করে BM&DC পাঠ্যবই (ডেভিডসন, গাইটন, রবিন্স) অনুসরণ করুন।'
          : 'No directly matching approved lesson found in the current verified database. Please reference accredited BM&DC textbooks (Davidson, Guyton, Robbins, Katzung).',
        citations: ['BM&DC National MBBS Syllabus 2026', 'Davidson\'s Principles of Medicine 24th ed.'],
        isConfigured: false
      };
    }
  }
}
