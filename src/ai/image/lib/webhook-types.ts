/**
 * Webhook回调相关类型定义
 */

/**
 * Replicate webhook数据结构
 */
export interface ReplicateWebhookData {
  id: string; // Replicate预测ID
  version: string; // 模型版本
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, any>; // 输入参数
  output?: string[]; // 生成的图片URL数组
  error?: string; // 错误信息
  logs?: string; // 执行日志
  metrics?: {
    predict_time?: number; // 预测耗时（秒）
  };
  created_at: string; // ISO时间戳
  started_at?: string; // ISO时间戳
  completed_at?: string; // ISO时间戳
  urls?: {
    get: string; // 获取预测结果的URL
    cancel: string; // 取消预测的URL
  };
}

/**
 * Webhook处理结果
 */
export interface WebhookProcessResult {
  success: boolean;
  taskId: string;
  action: 'completed' | 'failed' | 'updated' | 'ignored';
  message?: string;
  error?: string;
}

/**
 * 图片下载和上传结果
 */
export interface ImageProcessResult {
  success: boolean;
  originalUrl: string;
  uploadedUrl?: string;
  filename?: string;
  error?: string;
}

/**
 * Webhook验证配置
 */
export interface WebhookConfig {
  enableSignatureVerification: boolean;
  secretKey?: string;
  allowedHosts?: string[];
}

/**
 * Webhook事件类型
 */
export enum WebhookEventType {
  PREDICTION_STARTED = 'prediction.started',
  PREDICTION_COMPLETED = 'prediction.completed',
  PREDICTION_FAILED = 'prediction.failed',
  PREDICTION_CANCELED = 'prediction.canceled',
}

/**
 * 通用webhook响应
 */
export interface WebhookResponse {
  received: boolean;
  processed?: boolean;
  taskId?: string;
  error?: string;
}
