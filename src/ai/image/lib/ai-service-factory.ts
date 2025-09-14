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
  private webhookBaseUrl?: string;

  constructor(apiToken: string, webhookBaseUrl?: string) {
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.replicate.com/v1';
    this.webhookBaseUrl = webhookBaseUrl;

    console.log('[ReplicateService] 服务初始化:', {
      baseUrl: this.baseUrl,
      hasApiToken: !!apiToken,
      hasWebhookBaseUrl: !!webhookBaseUrl,
      webhookBaseUrl: webhookBaseUrl ? '[已配置]' : '[未配置]',
    });
  }

  async createPrediction(
    params: CreatePredictionParams
  ): Promise<PredictionResponse> {
    const requestId = Date.now().toString().slice(-8);
    console.log(`[ReplicateService:${requestId}] 开始创建预测任务:`, {
      prompt:
        params.prompt.substring(0, 50) +
        (params.prompt.length > 50 ? '...' : ''),
      promptLength: params.prompt.length,
      hasInputImages: !!(params.inputImages && params.inputImages.length > 0),
      inputImagesCount: params.inputImages?.length || 0,
      modelId: params.modelId,
      hasWebhookUrl: !!params.webhookUrl,
    });

    const { prompt, inputImages, modelId, webhookUrl } = params;

    console.log(`[ReplicateService:${requestId}] 构建请求体...`);
    const requestBody: Record<string, any> = {
      version: modelId,
      input: {
        prompt: prompt,
        num_outputs: 1,
      },
    };

    // 如果有输入图片，添加到请求中
    if (inputImages && inputImages.length > 0) {
      const image = inputImages[0];
      console.log(`[ReplicateService:${requestId}] 处理输入图片:`, {
        imageType: image instanceof File ? 'File' : 'string',
        imageName: image instanceof File ? image.name : 'URL',
        imageSize:
          image instanceof File
            ? `${(image.size / 1024 / 1024).toFixed(2)}MB`
            : 'N/A',
      });

      if (image instanceof File) {
        // 使用Replicate Local File方式，直接传递File对象
        requestBody.input.image = image;
        console.log(`[ReplicateService:${requestId}] 使用File对象作为输入图片`);
      } else if (typeof image === 'string') {
        // 使用现有URL方式，保持向后兼容
        requestBody.input.image = image;
        console.log(
          `[ReplicateService:${requestId}] 使用URL作为输入图片: ${image.substring(0, 50)}...`
        );
      }
      // 大多数模型只支持单张输入图片
    }

    // 构建完整的webhook URL
    // 优先使用传入的webhookUrl，其次使用实例的webhookBaseUrl
    const finalWebhookUrl =
      webhookUrl ||
      (this.webhookBaseUrl ? buildWebhookUrl(this.webhookBaseUrl) : undefined);

    console.log(`[ReplicateService:${requestId}] Webhook URL 处理:`, {
      paramWebhookUrl: webhookUrl ? '[提供]' : '[未提供]',
      instanceWebhookBaseUrl: this.webhookBaseUrl ? '[配置]' : '[未配置]',
      finalWebhookUrl: finalWebhookUrl ? '[生成成功]' : '[未生成]',
    });

    // 如果有webhook URL，添加到请求中
    if (finalWebhookUrl) {
      requestBody.webhook = finalWebhookUrl;
      requestBody.webhook_events_filter = ['completed'];
      console.log(
        `[ReplicateService:${requestId}] 添加webhook到请求: ${finalWebhookUrl}`
      );
    } else {
      console.log(
        `[ReplicateService:${requestId}] 未配置webhook，将使用轮询方式`
      );
    }

    console.log(`[ReplicateService:${requestId}] 最终请求体:`, {
      version: requestBody.version,
      inputKeys: Object.keys(requestBody.input),
      hasWebhook: !!requestBody.webhook,
      webhookEventsFilter: requestBody.webhook_events_filter,
    });

    console.log(
      `[ReplicateService:${requestId}] 发送API请求到: ${this.baseUrl}/predictions`
    );
    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(
      `[ReplicateService:${requestId}] API响应状态: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      console.error(`[ReplicateService:${requestId}] API请求失败`);
      let errorDetail: string;
      try {
        const errorResponse: any = await response.json();
        errorDetail =
          errorResponse.detail || errorResponse.message || '未知错误';
        console.error(
          `[ReplicateService:${requestId}] 错误详情:`,
          errorResponse
        );
      } catch (parseError) {
        console.error(
          `[ReplicateService:${requestId}] 无法解析错误响应:`,
          parseError
        );
        errorDetail = response.statusText;
      }

      throw new Error(`Replicate API error: ${errorDetail}`);
    }

    console.log(`[ReplicateService:${requestId}] 解析API响应...`);
    const result = await response.json();
    console.log(`[ReplicateService:${requestId}] 预测创建成功:`, {
      id: result.id,
      status: result.status,
      hasInput: !!result.input,
      hasOutput: !!result.output,
      hasError: !!result.error,
      createdAt: result.created_at,
    });

    return result;
  }

  async getPrediction(predictionId: string): Promise<PredictionStatus> {
    const requestId = Date.now().toString().slice(-8);
    console.log(
      `[ReplicateService:${requestId}] 查询预测状态: ${predictionId}`
    );

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

    console.log(
      `[ReplicateService:${requestId}] 状态查询响应: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      console.error(`[ReplicateService:${requestId}] 状态查询失败`);
      let errorDetail: string;
      try {
        const errorResponse: any = await response.json();
        errorDetail =
          errorResponse.detail || errorResponse.message || '未知错误';
        console.error(
          `[ReplicateService:${requestId}] 错误详情:`,
          errorResponse
        );
      } catch (parseError) {
        console.error(
          `[ReplicateService:${requestId}] 无法解析错误响应:`,
          parseError
        );
        errorDetail = response.statusText;
      }

      throw new Error(`Replicate API error: ${errorDetail}`);
    }

    const result = await response.json();
    console.log(`[ReplicateService:${requestId}] 预测状态查询成功:`, {
      id: result.id,
      status: result.status,
      hasOutput: !!result.output,
      hasError: !!result.error,
      completedAt: result.completed_at,
    });

    return result;
  }

  getProviderName(): string {
    return 'Replicate';
  }
}

/**
 * 构建完整的webhook URL
 */
export function buildWebhookUrl(
  baseUrl?: string,
  taskId?: string
): string | undefined {
  console.log('[buildWebhookUrl] 构建webhook URL:', {
    hasBaseUrl: !!baseUrl,
    baseUrl: baseUrl
      ? baseUrl.substring(0, 50) + (baseUrl.length > 50 ? '...' : '')
      : '[未提供]',
    hasTaskId: !!taskId,
    taskId: taskId || '[未提供]',
  });

  if (!baseUrl) {
    console.log('[buildWebhookUrl] 基础URL未提供，返回undefined');
    return undefined;
  }

  // 确保baseUrl以斜杠结尾
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  console.log('[buildWebhookUrl] 标准化基础URL:', normalizedBaseUrl);

  // 拼接API路径
  const webhookPath = 'api/webhooks/ai-photo-completion';
  const fullUrl = `${normalizedBaseUrl}${webhookPath}`;
  console.log('[buildWebhookUrl] 完整URL (不含参数):', fullUrl);

  // 如果有taskId，添加查询参数
  const finalUrl = taskId ? `${fullUrl}?taskId=${taskId}` : fullUrl;
  console.log('[buildWebhookUrl] 最终webhook URL:', finalUrl);

  return finalUrl;
}

/**
 * AI服务工厂函数
 */
export function createAIService(provider = 'replicate'): AIService {
  console.log('[createAIService] 创建AI服务:', { provider });

  switch (provider) {
    case 'replicate': {
      const apiToken = process.env.REPLICATE_API_TOKEN;
      console.log('[createAIService] 检查Replicate配置:', {
        hasApiToken: !!apiToken,
        apiTokenLength: apiToken ? apiToken.length : 0,
      });

      if (!apiToken) {
        console.error('[createAIService] REPLICATE_API_TOKEN 环境变量未配置');
        throw new Error('REPLICATE_API_TOKEN environment variable is required');
      }

      // 统一使用REPLICATE_WEBHOOK_URL环境变量
      const webhookBaseUrl =
        process.env.REPLICATE_WEBHOOK_URL || process.env.WEBHOOK_URL;
      console.log('[createAIService] Webhook配置:', {
        hasReplicateWebhookUrl: !!process.env.REPLICATE_WEBHOOK_URL,
        hasGenericWebhookUrl: !!process.env.WEBHOOK_URL,
        finalWebhookBaseUrl: webhookBaseUrl ? '[已配置]' : '[未配置]',
      });

      console.log('[createAIService] 创建ReplicateService实例');
      return new ReplicateService(apiToken, webhookBaseUrl);
    }

    default:
      console.error('[createAIService] 不支持的AI提供商:', provider);
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * 获取默认AI服务实例
 */
export function getDefaultAIService(): AIService {
  console.log('[getDefaultAIService] 获取默认AI服务 (replicate)');
  return createAIService('replicate');
}
