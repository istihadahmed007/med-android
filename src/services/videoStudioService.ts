import { 
  VideoGenerationJob, 
  LessonVideo, 
  MedicalReviewForm, 
  VideoStudentProgress, 
  CreateVideoJobRequest,
  SelfHostedMedicalVideo,
  VokaCandidateVideo,
  VokaSyncReport,
  VokaPublishPayload
} from '../types/videoStudio';
import { UserRole } from '../types';
import { StorageService } from './storageService';
import { safeFetchJson } from './videoStudioHttp';
import { MEDICAL_VIDEO_LIBRARY } from '../data/medicalVideoLibraryData';
import { AuthService } from './authService';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/video-studio` : '/api/video-studio';

export class VideoStudioService {
  private static getAuthHeaders(): Record<string, string> {
    const session = AuthService.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }
  /**
   * Fetch verified self-hosted medical videos.
   * Verifies HTTP status, requires JSON content-type, rejects HTML responses,
   * and cleanly falls back to the embedded verified catalog.
   */
  static async getSelfHostedVideos(): Promise<SelfHostedMedicalVideo[]> {
    try {
      const res = await safeFetchJson<SelfHostedMedicalVideo[]>(`${API_BASE}/library`);
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.filter(v => !JSON.stringify(v).toLowerCase().includes('kenhub'));
      }
    } catch {
      // safe fallback
    }
    return MEDICAL_VIDEO_LIBRARY.filter(v => !JSON.stringify(v).toLowerCase().includes('kenhub'));
  }

  /**
   * Fetch comprehensive taxonomy for Anatomy and Surgery collections.
   */
  static async getTaxonomy(): Promise<{ taxonomy: Record<string, Record<string, string[]>>; counts?: Record<string, number>; totalVideos?: number }> {
    try {
      const res = await safeFetchJson<{ taxonomy: Record<string, Record<string, string[]>>; counts?: Record<string, number>; totalVideos?: number }>(`${API_BASE}/taxonomy`);
      if (res.ok && res.data && res.data.taxonomy) {
        return res.data;
      }
    } catch {
      // fallback
    }
    return {
      taxonomy: {
        anatomy: {},
        surgery: {}
      },
      totalVideos: MEDICAL_VIDEO_LIBRARY.length
    };
  }

  /**
   * Query videos with backend filter parameters.
   */
  static async getVideos(filters: Record<string, any> = {}): Promise<SelfHostedMedicalVideo[]> {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.collection && filters.collection !== 'all') params.set('collection', filters.collection);
      if (filters.subtopic && filters.subtopic !== 'all') params.set('subtopic', filters.subtopic);
      if (filters.topic && filters.topic !== 'all') params.set('topic', filters.topic);
      if (filters.phase && filters.phase !== 'all') params.set('phase', filters.phase);
      if (filters.difficulty && filters.difficulty !== 'all') params.set('difficulty', filters.difficulty);
      if (filters.mediaType && filters.mediaType !== 'all') params.set('mediaType', filters.mediaType);
      if (filters.duration) params.set('duration', filters.duration);
      if (filters.query && filters.query.trim()) params.set('query', filters.query.trim());
      if (filters.status) params.set('status', filters.status);

      const qs = params.toString();
      const url = qs ? `${API_BASE}/videos?${qs}` : `${API_BASE}/videos`;
      const res = await safeFetchJson<SelfHostedMedicalVideo[]>(url);
      if (res.ok && Array.isArray(res.data)) {
        return res.data.filter(v => !JSON.stringify(v).toLowerCase().includes('kenhub'));
      }
    } catch {
      // fallback
    }
    return MEDICAL_VIDEO_LIBRARY.filter(v => !JSON.stringify(v).toLowerCase().includes('kenhub'));
  }

  /**
   * Get single video by ID.
   */
  static async getVideoById(id: string): Promise<SelfHostedMedicalVideo | null> {
    try {
      const res = await safeFetchJson<SelfHostedMedicalVideo>(`${API_BASE}/videos/${encodeURIComponent(id)}`);
      if (res.ok && res.data) {
        return res.data;
      }
    } catch {
      // fallback
    }
    return MEDICAL_VIDEO_LIBRARY.find(v => v.id === id) || null;
  }

  /**
   * Submit new draft video (Faculty / Admin only).
   */
  static async createVideo(payload: Partial<SelfHostedMedicalVideo>, _role?: UserRole): Promise<SelfHostedMedicalVideo> {
    const res = await safeFetchJson<{ success: boolean; video: SelfHostedMedicalVideo }>(`${API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (res.ok && res.data?.video) {
      return res.data.video;
    }
    throw new Error('Failed to create video record. Ensure all required fields are provided.');
  }

  /**
   * Update video metadata.
   */
  static async updateVideo(id: string, payload: Partial<SelfHostedMedicalVideo>, _role?: UserRole): Promise<SelfHostedMedicalVideo> {
    const res = await safeFetchJson<{ success: boolean; video: SelfHostedMedicalVideo }>(`${API_BASE}/videos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (res.ok && res.data?.video) {
      return res.data.video;
    }
    throw new Error('Failed to update video record.');
  }

  /**
   * Submit medical peer review.
   */
  static async submitVideoReview(
    id: string,
    review: { decision: 'approved' | 'revision_requested' | 'rejected'; comments?: string; checklist?: any },
    _role?: UserRole
  ): Promise<any> {
    const res = await safeFetchJson(`${API_BASE}/videos/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(review)
    });

    if (!res.ok) {
      throw new Error('Failed to submit formal peer review.');
    }
    return res.data;
  }

  /**
   * Publish an approved video.
   */
  static async publishVideo(id: string, _role?: UserRole): Promise<void> {
    const res = await safeFetchJson(`${API_BASE}/videos/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders()
      }
    });

    if (!res.ok) {
      throw new Error('Failed to publish video.');
    }
  }

  /**
   * Archive a video.
   */
  static async archiveVideo(id: string, _role?: UserRole): Promise<void> {
    const res = await safeFetchJson(`${API_BASE}/videos/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders()
      }
    });

    if (!res.ok) {
      throw new Error('Failed to archive video.');
    }
  }

  /**
   * Fetch all video generation jobs.
   */
  static async getJobs(activeRole: UserRole = 'author'): Promise<VideoGenerationJob[]> {
    return StorageService.getVideoJobs();
  }

  /**
   * Fetch published videos.
   */
  static async getPublishedVideos(lessonId?: string): Promise<LessonVideo[]> {
    return StorageService.getPublishedVideos(lessonId);
  }

  /**
   * Retired generation entry point.
   */
  static async queueJob(payload: CreateVideoJobRequest): Promise<{ success: boolean; job: VideoGenerationJob; message?: string }> {
    throw new Error('Video generation is retired. Browse official educational videos in Medical Videos.');
  }

  /**
   * Retry a failed video job.
   */
  static async retryJob(jobId: string, _role?: UserRole): Promise<void> {
    const res = await safeFetchJson(`${API_BASE}/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders()
      }
    });

    if (!res.ok) {
      const job = StorageService.getVideoJobs().find(j => j.id === jobId);
      if (job && job.retryCount < job.maxRetries) {
        StorageService.updateVideoJob(jobId, {
          status: 'queued',
          retryCount: job.retryCount + 1,
          error: undefined
        });
      }
    }
  }

  /**
   * Cancel an in-flight or queued job.
   */
  static async cancelJob(jobId: string, _role?: UserRole): Promise<void> {
    const res = await safeFetchJson(`${API_BASE}/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders()
      }
    });

    if (!res.ok) {
      StorageService.updateVideoJob(jobId, { status: 'cancelled' });
    }
  }

  /**
   * Submit medical peer review.
   */
  static async submitReview(payload: MedicalReviewForm): Promise<void> {
    const res = await safeFetchJson<{ success: boolean; error?: string }>(`${API_BASE}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok && res.data?.error) {
      throw new Error('The review could not be saved. Please try again.');
    }

    // Persist locally in storage as well
    StorageService.saveVideoReview(payload);
  }

  /**
   * Get student video progress.
   */
  static async getProgress(studentId: string, videoId: string): Promise<VideoStudentProgress | null> {
    const res = await safeFetchJson<VideoStudentProgress>(
      `${API_BASE}/progress?studentId=${encodeURIComponent(studentId)}&videoId=${encodeURIComponent(videoId)}`
    );

    if (res.ok && res.data) {
      return res.data;
    }

    return StorageService.getVideoProgress(studentId, videoId);
  }

  /**
   * Save student video progress.
   */
  static async saveProgress(progress: Partial<VideoStudentProgress> & { videoId: string; studentId: string; notes?: string }): Promise<void> {
    // Always save to localStorage immediately
    StorageService.saveVideoProgress(progress);

    // Sync to backend if available
    await safeFetchJson(`${API_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress)
    });
  }

  // =========================================================================
  // VOKA 3D Anatomy & Pathology Official Channel Integration
  // =========================================================================

  /**
   * Trigger server-side synchronization with official VOKA YouTube channel (@vokaio).
   */
  static async syncVokaChannel(_role?: UserRole): Promise<{ success: boolean; report: VokaSyncReport; candidates: VokaCandidateVideo[] }> {
    const res = await safeFetchJson<{ success: boolean; report: VokaSyncReport; candidates: VokaCandidateVideo[] }>(
      `${API_BASE}/sources/voka/sync`,
      {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders()
        }
      }
    );

    if (res.ok && res.data) {
      return res.data;
    }
    throw new Error('Failed to synchronize with VOKA YouTube channel. Please check connection.');
  }

  /**
   * Fetch unreviewed VOKA candidates pending editorial review.
   */
  static async getVokaCandidates(_role?: UserRole): Promise<VokaCandidateVideo[]> {
    const res = await safeFetchJson<VokaCandidateVideo[]>(`${API_BASE}/sources/voka/candidates`, {
      headers: {
        ...this.getAuthHeaders()
      }
    });
    if (res.ok && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  /**
   * Approve and publish a VOKA candidate video into the official MEDX video library.
   */
  static async publishVokaCandidate(
    payload: VokaPublishPayload, 
    _role?: UserRole,
    reviewerName?: string
  ): Promise<SelfHostedMedicalVideo> {
    const user = AuthService.getCurrentUser();
    const resolvedReviewerName = reviewerName || user?.user_metadata?.full_name || 'Faculty Reviewer';
    const res = await safeFetchJson<{ success: boolean; video: SelfHostedMedicalVideo }>(
      `${API_BASE}/sources/voka/publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reviewer-name': resolvedReviewerName,
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(payload)
      }
    );

    if (res.ok && res.data?.video) {
      return res.data.video;
    }
    throw new Error('Failed to publish VOKA video. Ensure all required review fields are provided.');
  }

  /**
   * Reject a candidate video.
   */
  static async rejectVokaCandidate(payload: { id?: string; youtubeVideoId: string }, _role?: UserRole): Promise<void> {
    const res = await safeFetchJson(`${API_BASE}/sources/voka/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Failed to reject candidate.');
    }
  }

  /**
   * Execute video health check audit.
   */
  static async runVokaHealthCheck(_role?: UserRole): Promise<{ totalAudited: number; archivedCount: number; verifiedCount?: number }> {
    const res = await safeFetchJson<{ totalAudited: number; archivedCount: number; verifiedCount?: number }>(
      `${API_BASE}/sources/voka/health-check`,
      {
        headers: {
          ...this.getAuthHeaders()
        }
      }
    );
    if (res.ok && res.data) {
      const data = res.data;
      if (data.verifiedCount === undefined) {
        data.verifiedCount = Math.max(0, data.totalAudited - data.archivedCount);
      }
      return data;
    }
    return { totalAudited: 0, archivedCount: 0, verifiedCount: 0 };
  }
}
