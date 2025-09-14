/**
 * AI服务抽象层
 *
 * 为AI图片编辑器提供统一的服务接口，支持多个AI平台
 */

/**
 * 创建预测请求参数
 */
export interface CreatePredictionParams {
  prompt: string;
  inputImages?: (string | File)[];
  modelId: string;
  webhookUrl?: string;
}

/**
 * 预测响应结果
 */
export interface PredictionResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, any>;
  output?: string[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 预测状态查询结果
 */
export interface PredictionStatus {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[];
  error?: string;
  completedAt?: string;
}

/**
 * AI服务接口
 */
export interface AIService {
  /**
   * 创建预测任务
   */
  createPrediction(params: CreatePredictionParams): Promise<PredictionResponse>;

  /**
   * 查询预测状态
   */
  getPrediction(predictionId: string): Promise<PredictionStatus>;

  /**
   * 获取服务提供商名称
   */
  getProviderName(): string;
}

/**
 * Replicate服务实现
 */
export class ReplicateService implements AIService {
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string, webhookUrl?: string) {
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.replicate.com/v1';
  }

  async createPrediction(
    params: CreatePredictionParams
  ): Promise<PredictionResponse> {
    const { prompt, inputImages, modelId, webhookUrl } = params;

    const requestBody: any = {
      version: modelId,
      input: {
        prompt: prompt,
        num_outputs: 1,
      },
    };

    // 如果有输入图片，添加到请求中
    if (inputImages && inputImages.length > 0) {
      const image = inputImages[0];
      if (image instanceof File) {
        // 使用Replicate Local File方式，直接传递File对象
        requestBody.input.image = image;
      } else if (typeof image === 'string') {
        // 使用现有URL方式，保持向后兼容
        requestBody.input.image = image;
      }
      // 大多数模型只支持单张输入图片
    }

    // 如果有webhook URL，添加到请求中
    if (webhookUrl) {
      requestBody.webhook = webhookUrl;
      requestBody.webhook_events_filter = ['completed'];
    }

    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Replicate API error: ${error.detail || response.statusText}`
      );
    }

    return await response.json();
  }

  async getPrediction(predictionId: string): Promise<PredictionStatus> {
    const response = await fetch(
      `${this.baseUrl}/predictions/${predictionId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Replicate API error: ${error.detail || response.statusText}`
      );
    }

    return await response.json();
  }

  getProviderName(): string {
    return 'Replicate';
  }
}

/**
 * AI服务工厂函数
 */
export function createAIService(provider = 'replicate'): AIService {
  switch (provider) {
    case 'replicate': {
      const apiToken = process.env.REPLICATE_API_TOKEN;
      if (!apiToken) {
        throw new Error('REPLICATE_API_TOKEN environment variable is required');
      }
      return new ReplicateService(apiToken, process.env.WEBHOOK_URL);
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * 获取默认AI服务实例
 */
export function getDefaultAIService(): AIService {
  return createAIService('replicate');
}
