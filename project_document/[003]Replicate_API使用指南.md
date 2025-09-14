# Replicate API 使用指南 - Predictions模式与Webhook集成

## 📋 概述

本文档详细介绍如何使用Replicate的Predictions API调用AI模型，并通过Webhook接收异步处理结果。适用于需要调用AI图片生成模型（如google/nano-banana）的场景。

## 🔑 核心概念

### Predictions（预测）
- **定义**: 一次模型运行的实例
- **特点**: 异步执行，支持轮询和Webhook两种结果获取方式
- **生命周期**: starting → processing → succeeded/failed/canceled

### Webhook
- **用途**: 异步接收模型执行结果，避免轮询
- **优势**: 实时通知、减少API调用、更高效
- **安全**: 支持签名验证确保请求合法性

## 🚀 快速开始

### 1. 获取API Token

```bash
# 在 https://replicate.com/account/api-tokens 获取token
export REPLICATE_API_TOKEN="r8_**********************"
```

### 2. 环境变量配置

```env
REPLICATE_API_TOKEN=r8_**********************
WEBHOOK_URL=https://your-domain.com/api/webhooks/replicate
WEBHOOK_SECRET=your-webhook-secret  # 用于签名验证
```

## 📡 API调用流程

### 1. 创建Prediction（异步模式）

```typescript
// POST https://api.replicate.com/v1/predictions
async function createPrediction(prompt: string, inputImages?: string[]) {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: "google/nano-banana:latest", // 或使用完整版本ID
      input: {
        prompt: prompt,
        image: inputImages?.[0], // 如果模型支持图片输入
        num_outputs: 1,
        // 其他模型特定参数
      },
      webhook: process.env.WEBHOOK_URL,
      webhook_events_filter: ["start", "completed"] // 可选：过滤事件类型
    })
  });

  const prediction = await response.json();
  return prediction;
}

// 响应示例
{
  "id": "rrr4z55ocneqzikepnug6xezpe",
  "version": "google/nano-banana:latest",
  "status": "starting",
  "input": {
    "prompt": "a cute rabbit",
    "num_outputs": 1
  },
  "created_at": "2024-01-01T10:00:00Z",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/rrr4z55ocneqzikepnug6xezpe",
    "cancel": "https://api.replicate.com/v1/predictions/rrr4z55ocneqzikepnug6xezpe/cancel"
  }
}
```

### 2. 同步模式（等待结果）

```typescript
// 使用 Prefer: wait 头部，最多等待60秒
async function createPredictionSync(prompt: string) {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60' // 等待最多60秒
    },
    body: JSON.stringify({
      version: "google/nano-banana:latest",
      input: { prompt }
    })
  });

  const prediction = await response.json();

  if (prediction.status === 'succeeded') {
    return prediction.output; // 直接返回结果
  }

  // 如果超时，需要轮询或等待webhook
  return prediction;
}
```

## 🔄 轮询机制实现

```typescript
async function pollPredictionStatus(predictionId: string, maxAttempts = 13) {
  const pollInterval = 3000; // 3秒
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`
          }
        }
      );

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return {
          success: true,
          output: prediction.output,
          metrics: prediction.metrics
        };
      }

      if (prediction.status === 'failed') {
        return {
          success: false,
          error: prediction.error
        };
      }

      if (prediction.status === 'canceled') {
        return {
          success: false,
          error: 'Prediction was canceled'
        };
      }

      // 继续轮询
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error('Polling error:', error);
      throw error;
    }
  }

  // 超时
  return {
    success: false,
    error: 'Polling timeout after 40 seconds'
  };
}
```

## 🪝 Webhook接收实现

### 1. Webhook处理器

```typescript
// POST /api/webhooks/replicate
export async function POST(request: Request) {
  try {
    // 1. 验证签名（如果配置了）
    const signature = request.headers.get('webhook-signature');
    const body = await request.text();

    if (!verifyWebhookSignature(body, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const webhookData = JSON.parse(body);

    // 2. 处理不同状态
    switch (webhookData.status) {
      case 'starting':
        console.log(`Prediction ${webhookData.id} is starting`);
        break;

      case 'processing':
        console.log(`Prediction ${webhookData.id} is processing`);
        break;

      case 'succeeded':
        await handleSuccessfulPrediction(webhookData);
        break;

      case 'failed':
        await handleFailedPrediction(webhookData);
        break;

      case 'canceled':
        console.log(`Prediction ${webhookData.id} was canceled`);
        break;
    }

    // 3. 返回200确认接收
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 处理成功的预测
async function handleSuccessfulPrediction(webhookData: any) {
  const { id, output, metrics } = webhookData;

  // 如果输出是图片URL，下载并上传到自己的存储
  if (output && Array.isArray(output)) {
    for (const imageUrl of output) {
      // 下载图片
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      // 上传到自己的存储服务
      const uploadedUrl = await uploadToStorage(
        Buffer.from(imageBuffer),
        `ai-outputs/${id}.png`
      );

      // 更新数据库
      await updateTaskStatus(id, {
        status: 'completed',
        outputImageUrl: uploadedUrl,
        completedAt: new Date(),
        metrics
      });
    }
  }
}

// 处理失败的预测
async function handleFailedPrediction(webhookData: any) {
  const { id, error } = webhookData;

  await updateTaskStatus(id, {
    status: 'failed',
    errorMessage: error,
    completedAt: new Date()
  });
}
```

### 2. Webhook签名验证

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature || !process.env.WEBHOOK_SECRET) {
    return true; // 如果没有配置签名，跳过验证
  }

  // Replicate使用HMAC-SHA256签名
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // 使用timing-safe比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## 📤 文件处理

### 上传文件作为输入

```typescript
// 方式1：使用HTTP URL（推荐用于大文件）
const input = {
  image: "https://example.com/input-image.jpg",
  prompt: "enhance this image"
};

// 方式2：使用Data URL（适用于小文件 <256KB）
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

const dataUrl = await fileToDataURL(file);
const input = {
  image: dataUrl,
  prompt: "enhance this image"
};

// 方式3：先上传到Replicate的文件服务
async function uploadToReplicate(file: File) {
  // 1. 获取上传URL
  const response = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type
    })
  });

  const { upload_url, serving_url } = await response.json();

  // 2. 上传文件
  await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  return serving_url;
}
```

### 处理输出文件

```typescript
// 输出通常是URL数组
interface PredictionOutput {
  output?: string[]; // 图片URL数组
  metrics?: {
    predict_time: number; // 预测耗时（秒）
  };
}

async function downloadOutputFiles(output: string[]) {
  const files = [];

  for (const url of output) {
    // 注意：需要传递Authorization头部
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`
      }
    });

    const buffer = await response.arrayBuffer();
    files.push(Buffer.from(buffer));
  }

  return files;
}
```

## ⚡ 最佳实践

### 1. 错误处理

```typescript
class ReplicateError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ReplicateError';
  }
}

async function safeCreatePrediction(input: any) {
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ReplicateError(
        error.detail || 'API request failed',
        response.status,
        error
      );
    }

    return await response.json();

  } catch (error) {
    if (error instanceof ReplicateError) {
      throw error;
    }

    // 网络错误等
    throw new ReplicateError('Network error', 0, error);
  }
}
```

### 2. 重试机制

```typescript
async function createPredictionWithRetry(
  input: any,
  maxRetries = 3
) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await safeCreatePrediction(input);
    } catch (error) {
      lastError = error;

      // 不重试客户端错误（4xx）
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // 指数退避
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 3. 速率限制处理

```typescript
// Replicate API限制：
// - 600 requests/minute (免费层)
// - 10000 requests/minute (付费层)

class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private requestsPerMinute: number;
  private interval: number;

  constructor(requestsPerMinute = 600) {
    this.requestsPerMinute = requestsPerMinute;
    this.interval = 60000 / requestsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) await task();
      await new Promise(resolve => setTimeout(resolve, this.interval));
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter(600);

// 使用示例
const prediction = await rateLimiter.execute(() =>
  createPrediction(prompt, images)
);
```

## 🔒 安全考虑

### 1. API Token管理
- 永远不要在前端代码中暴露API Token
- 使用环境变量存储敏感信息
- 定期轮换Token

### 2. Webhook安全
- 始终验证Webhook签名
- 使用HTTPS接收Webhook
- 实现幂等性处理（Webhook可能重复发送）

### 3. 输入验证
```typescript
function validateInput(prompt: string, images?: string[]) {
  // 验证prompt
  if (!prompt || prompt.length > 1000) {
    throw new Error('Invalid prompt');
  }

  // 验证图片URL
  if (images) {
    for (const url of images) {
      if (!isValidUrl(url)) {
        throw new Error('Invalid image URL');
      }
    }
  }

  // 检查敏感内容
  if (containsSensitiveContent(prompt)) {
    throw new Error('Content policy violation');
  }
}
```

## 📊 监控和日志

```typescript
// 记录API调用
async function logPrediction(
  predictionId: string,
  status: string,
  metrics?: any
) {
  console.log({
    timestamp: new Date().toISOString(),
    predictionId,
    status,
    metrics,
    // 添加追踪信息
    userId: getCurrentUserId(),
    sessionId: getSessionId()
  });

  // 发送到监控服务
  await sendToMonitoring({
    event: 'prediction',
    predictionId,
    status,
    metrics
  });
}
```

## 🎯 完整示例：AI图片生成服务

```typescript
class AIImageService {
  private apiToken: string;
  private webhookUrl: string;
  private rateLimiter: RateLimiter;

  constructor() {
    this.apiToken = process.env.REPLICATE_API_TOKEN!;
    this.webhookUrl = process.env.WEBHOOK_URL!;
    this.rateLimiter = new RateLimiter(600);
  }

  async generateImage(
    prompt: string,
    userId: string,
    sessionId: string
  ) {
    // 1. 创建任务记录
    const task = await createTask({
      userId,
      sessionId,
      prompt,
      status: 'pending'
    });

    // 2. 调用Replicate API
    const prediction = await this.rateLimiter.execute(() =>
      this.createPrediction(prompt, task.id)
    );

    // 3. 更新任务状态
    await updateTask(task.id, {
      predictionId: prediction.id,
      status: 'processing'
    });

    // 4. 返回任务ID供前端轮询
    return {
      taskId: task.id,
      predictionId: prediction.id
    };
  }

  private async createPrediction(prompt: string, taskId: string) {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'google/nano-banana:latest',
        input: { prompt },
        webhook: `${this.webhookUrl}?taskId=${taskId}`,
        webhook_events_filter: ['completed']
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create prediction');
    }

    return response.json();
  }
}
```

## 📚 参考资源

- [Replicate API文档](https://replicate.com/docs/reference/http)
- [Predictions生命周期](https://replicate.com/docs/topics/predictions/lifecycle)
- [Webhook配置指南](https://replicate.com/docs/topics/webhooks)
- [速率限制说明](https://replicate.com/docs/topics/predictions/rate-limits)
- [Python客户端库](https://github.com/replicate/replicate-python)
- [Node.js客户端库](https://github.com/replicate/replicate-javascript)

---

**文档版本**: 1.0.0
**更新日期**: 2024-01-01
**适用版本**: Replicate API v1
