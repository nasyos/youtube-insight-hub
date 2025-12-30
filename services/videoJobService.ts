/**
 * Video Job Service
 * 要約ジョブの管理と処理
 */

import { createClient } from '@supabase/supabase-js';
import { GeminiService } from './geminiService';
import { GoogleApiService } from './googleApiService';
import { YouTubeService } from './youtubeService';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface VideoJob {
  id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  started_at?: string;
  finished_at?: string;
  error?: string;
  summary_text?: string;
  key_points?: string[];
  doc_url?: string;
  doc_id?: string;
  notified_at?: string;
}

export class VideoJobService {
  private geminiService: GeminiService;
  private googleApiService: GoogleApiService | null;
  private youtubeService: YouTubeService;

  constructor(
    geminiService: GeminiService,
    googleApiService: GoogleApiService | null,
    youtubeService: YouTubeService
  ) {
    this.geminiService = geminiService;
    this.googleApiService = googleApiService;
    this.youtubeService = youtubeService;
  }

  /**
   * 要約ジョブを作成
   */
  async createJob(videoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('video_jobs')
        .insert({
          id: `job_${videoId}_${Date.now()}`,
          video_id: videoId,
          status: 'pending'
        });

      if (error && error.code !== '23505') { // 23505 = unique_violation
        console.error('Create video job error:', error);
        throw error;
      }
    } catch (error) {
      console.error('createJob error:', error);
      throw error;
    }
  }

  /**
   * 保留中のジョブを取得
   */
  async getPendingJobs(limit: number = 10): Promise<VideoJob[]> {
    try {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []) as VideoJob[];
    } catch (error) {
      console.error('getPendingJobs error:', error);
      return [];
    }
  }

  /**
   * ジョブを処理（要約生成 → Google Docs作成 → 通知）
   */
  async processJob(jobId: string): Promise<void> {
    try {
      // ジョブを取得
      const { data: job, error: jobError } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      // ステータスをprocessingに更新
      await supabase
        .from('video_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // 動画情報を取得
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('*, channels!inner(name, channel_title)')
        .eq('video_id', job.video_id)
        .maybeSingle();

      if (videoError || !video) {
        throw new Error('Video not found');
      }

      const videoUrl = `https://www.youtube.com/watch?v=${job.video_id}`;

      // Gemini APIで要約生成
      const { summary, keyPoints } = await this.geminiService.summarizeVideo(
        videoUrl,
        video.title
      );

      // Google Docs作成
      let docUrl = '';
      let docId = '';

      if (this.googleApiService) {
        try {
          docUrl = await this.googleApiService.createSummaryDoc({
            id: job.video_id,
            title: video.title,
            publishedAt: video.published_at,
            thumbnailUrl: video.thumbnail_url || '',
            channelId: (video as any).channels.id,
            channelTitle: (video as any).channels.name,
            url: videoUrl,
            summary,
            keyPoints
          });
        } catch (docError) {
          console.error('Google Docs creation error:', docError);
          // エラーでも続行
        }
      }

      // ジョブを完了に更新
      await supabase
        .from('video_jobs')
        .update({
          status: 'done',
          finished_at: new Date().toISOString(),
          summary_text: summary,
          key_points: keyPoints,
          doc_url: docUrl,
          doc_id: docId
        })
        .eq('id', jobId);

      // 通知送信（実装は後で追加）
      // await this.sendNotification(job, video, summary, docUrl);

    } catch (error: any) {
      console.error('processJob error:', error);

      // ジョブを失敗に更新
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: error.message || 'Unknown error'
        })
        .eq('id', jobId);
    }
  }

  /**
   * 通知送信（後で実装）
   */
  private async sendNotification(
    job: VideoJob,
    video: any,
    summary: string,
    docUrl: string
  ): Promise<void> {
    // TODO: 通知機能を実装
    // - Google Chat
    // - Slack
    // - Email
    // など
  }
}


