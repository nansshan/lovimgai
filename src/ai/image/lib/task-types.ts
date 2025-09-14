/**
 * AI图片编辑任务相关类型定义
 */

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * AI任务信息
 */
export interface AITask {
  id: string;
  sessionId: string;
  prompt: string;
  inputImages?: string[];
  outputImageUrl?: string;
  status: TaskStatus;
  taskId?: string; // 第三方AI服务的任务ID
  providerModel: string;
  creditsCost: number;
  errorMessage?: string;
  sequenceOrder: number;
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
}

/**
 * 处理AI请求参数
 */
export interface ProcessAIRequest {
  sessionId: string;
  prompt: string;
  inputImages?: (string | File)[];
  modelId: string;
}

/**
 * 处理AI响应
 */
export interface ProcessAIResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 获取任务状态响应
 */
export interface GetTaskStatusResponse {
  success: boolean;
  task?: AITask;
  error?: string;
}

/**
 * 更新任务状态请求
 */
export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  outputImageUrl?: string;
  errorMessage?: string;
}

/**
 * 更新任务状态响应
 */
export interface UpdateTaskStatusResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  sessionId?: string;
  status?: TaskStatus;
  limit?: number;
  offset?: number;
}

/**
 * 批量获取任务响应
 */
export interface GetTasksResponse {
  success: boolean;
  tasks?: AITask[];
  total?: number;
  error?: string;
}
