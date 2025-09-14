/**
 * AI图片编辑器模型配置
 *
 * 专门为对话式图片编辑功能设计的模型配置
 */

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  creditsPerUse: number;
  maxImages: number;
  description?: string;
}

/**
 * AI图片编辑器可用模型列表
 */
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'google/nano-banana',
    name: 'Nano Banana',
    provider: 'Google',
    creditsPerUse: 8,
    maxImages: 1,
    description: 'Google的高效图片生成模型，专为对话式编辑优化',
  },
  {
    id: 'bytedance/seedream-4',
    name: 'SeeDream 4',
    provider: 'ByteDance',
    creditsPerUse: 12,
    maxImages: 1,
    description: '字节跳动的先进图片生成模型，支持高质量图像创作',
  },
  // 未来可以添加更多模型
];

/**
 * 默认模型配置
 */
export const DEFAULT_MODEL_ID = 'google/nano-banana';

/**
 * 模型配置管理函数
 */

/**
 * 获取模型配置
 */
export function getModelConfig(modelId: string): AIModel | null {
  return AVAILABLE_MODELS.find((model) => model.id === modelId) || null;
}

/**
 * 获取所有可用模型
 */
export function getAllModels(): AIModel[] {
  return AVAILABLE_MODELS;
}

/**
 * 检查模型是否存在
 */
export function isValidModel(modelId: string): boolean {
  return AVAILABLE_MODELS.some((model) => model.id === modelId);
}

/**
 * 根据积分余额过滤可用模型
 */
export function getAffordableModels(userCredits: number): AIModel[] {
  return AVAILABLE_MODELS.filter((model) => model.creditsPerUse <= userCredits);
}

/**
 * 模型相关的类型定义
 */
export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];
export type ProviderName = (typeof AVAILABLE_MODELS)[number]['provider'];
