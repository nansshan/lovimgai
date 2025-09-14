/**
 * AI图片编辑器会话相关类型定义
 */

/**
 * 编辑会话信息
 */
export interface EditSession {
  id: string;
  title: string;
  firstPrompt: string | null;
  taskCount: number;
  lastActivity: string; // ISO string
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

/**
 * 创建会话请求
 */
export type CreateSessionRequest = Record<string, never>;

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * 获取会话列表响应
 */
export interface GetSessionsResponse {
  success: boolean;
  sessions?: EditSession[];
  error?: string;
}

/**
 * 更新会话请求
 */
export interface UpdateSessionRequest {
  title?: string;
  lastActivity?: string;
}

/**
 * 更新会话响应
 */
export interface UpdateSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * 获取单个会话响应
 */
export interface GetSessionResponse {
  success: boolean;
  session?: EditSession;
  error?: string;
}

/**
 * 会话状态枚举
 */
export enum SessionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/**
 * 会话排序选项
 */
export enum SessionSortBy {
  LAST_ACTIVITY = 'lastActivity',
  CREATED_AT = 'createdAt',
  TITLE = 'title',
}

/**
 * 会话查询参数
 */
export interface SessionQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: SessionSortBy;
  status?: SessionStatus;
}
