import { randomUUID } from 'crypto';
import {
  buildWebhookUrl,
  createAIService,
} from '@/ai/image/lib/ai-service-factory';
import { getModelConfig } from '@/config/ai-models-config';
import { consumeCredits, getUserCredits } from '@/credits/credits';
import { CREDIT_TRANSACTION_TYPE } from '@/credits/types';
import { getDb } from '@/db';
import { aiPhotoSession, aiPhotoTask } from '@/db/schema';
import { getSession } from '@/lib/server';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface ProcessAIRequest {
  sessionId: string;
  prompt: string;
  inputImages?: string[]; // 上传后的图片URL数组
  modelId: string; // 'google/nano-banana'
}

interface ProcessAIResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 处理AI图片生成请求
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID().substring(0, 8);
  console.log(`[${requestId}] 开始处理AI图片生成请求`);

  try {
    // 验证用户认证
    console.log(`[${requestId}] 验证用户认证中...`);
    const session = await getSession();
    if (!session?.user) {
      console.log(`[${requestId}] 用户认证失败：未找到用户会话`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log(`[${requestId}] 用户认证成功，用户ID: ${userId}`);

    // 解析请求体
    console.log(`[${requestId}] 解析请求体...`);
    let body: ProcessAIRequest;
    try {
      body = await request.json();
      console.log(`[${requestId}] 请求参数:`, {
        sessionId: body.sessionId,
        promptLength: body.prompt?.length || 0,
        inputImagesCount: body.inputImages?.length || 0,
        modelId: body.modelId,
      });
    } catch (parseError) {
      console.error(`[${requestId}] 请求体解析失败:`, parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { sessionId, prompt, inputImages, modelId } = body;

    // 验证必要参数
    console.log(`[${requestId}] 验证必要参数...`);
    if (!sessionId || !prompt || !modelId) {
      console.log(`[${requestId}] 缺少必要参数:`, {
        hasSessionId: !!sessionId,
        hasPrompt: !!prompt,
        hasModelId: !!modelId,
      });
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 验证会话是否属于当前用户
    console.log(`[${requestId}] 验证会话权限，会话ID: ${sessionId}`);
    const db = await getDb();
    const sessionData = await db
      .select()
      .from(aiPhotoSession)
      .where(
        and(eq(aiPhotoSession.id, sessionId), eq(aiPhotoSession.userId, userId))
      )
      .limit(1);

    if (sessionData.length === 0) {
      console.log(
        `[${requestId}] 会话验证失败：未找到会话或会话不属于当前用户`
      );
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
    console.log(`[${requestId}] 会话验证成功`);

    // 获取模型配置
    console.log(`[${requestId}] 获取模型配置，模型ID: ${modelId}`);
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      console.log(`[${requestId}] 模型配置获取失败：未找到模型 ${modelId}`);
      return NextResponse.json(
        { success: false, error: 'Invalid model' },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] 模型配置获取成功:`, {
      name: modelConfig.name,
      creditsPerUse: modelConfig.creditsPerUse,
      provider: modelConfig.provider,
    });

    // 检查用户积分
    console.log(`[${requestId}] 检查用户积分...`);
    const userCredits = await getUserCredits(userId);
    console.log(
      `[${requestId}] 用户当前积分: ${userCredits}，需要积分: ${modelConfig.creditsPerUse}`
    );
    if (userCredits < modelConfig.creditsPerUse) {
      console.log(`[${requestId}] 积分不足，拒绝请求`);
      return NextResponse.json(
        {
          success: false,
          error: `积分不足，需要 ${modelConfig.creditsPerUse} 积分，当前余额 ${userCredits} 积分`,
        },
        { status: 400 }
      );
    }

    // 扣减积分（失败不回滚）
    console.log(`[${requestId}] 开始扣减积分...`);
    try {
      await consumeCredits({
        userId,
        amount: modelConfig.creditsPerUse,
        description: `AI图片生成 - ${modelConfig.name}`,
      });
      console.log(
        `[${requestId}] 积分扣减成功，扣减金额: ${modelConfig.creditsPerUse}`
      );
    } catch (error) {
      console.error(`[${requestId}] 积分扣减失败:`, error);
      return NextResponse.json(
        { success: false, error: '积分扣减失败' },
        { status: 500 }
      );
    }

    // 创建任务记录
    const taskId = randomUUID();
    const now = new Date();
    console.log(`[${requestId}] 创建任务记录，任务ID: ${taskId}`);

    // 获取当前会话的任务数量，用于设置序列号
    console.log(`[${requestId}] 获取会话任务数量...`);
    const taskCount = await db
      .select({ count: aiPhotoTask.sequenceOrder })
      .from(aiPhotoTask)
      .where(eq(aiPhotoTask.sessionId, sessionId))
      .orderBy(aiPhotoTask.sequenceOrder)
      .then((results) => results.length);
    console.log(`[${requestId}] 当前会话任务数量: ${taskCount}`);

    // 插入任务记录
    console.log(`[${requestId}] 插入任务记录到数据库...`);
    try {
      await db.insert(aiPhotoTask).values({
        id: taskId,
        userId: userId,
        sessionId: sessionId,
        prompt: prompt,
        inputImages: inputImages ? JSON.stringify(inputImages) : null,
        outputImageUrl: null,
        status: 'pending',
        taskId: null, // AI服务返回的任务ID，稍后更新
        providerModel: modelId,
        creditsCost: modelConfig.creditsPerUse,
        errorMessage: null,
        sequenceOrder: taskCount + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });
      console.log(`[${requestId}] 任务记录插入成功`);
    } catch (dbError) {
      console.error(`[${requestId}] 任务记录插入失败:`, dbError);
      throw dbError;
    }

    // 调用AI服务
    console.log(`[${requestId}] 开始调用AI服务...`);
    try {
      console.log(`[${requestId}] 创建AI服务实例 (replicate)`);
      const aiService = createAIService('replicate');

      // 构建完整的webhook URL
      const webhookBaseUrl =
        process.env.REPLICATE_WEBHOOK_URL || process.env.WEBHOOK_URL;
      console.log(
        `[${requestId}] Webhook基础URL: ${webhookBaseUrl ? '[已配置]' : '[未配置]'}`
      );

      const webhookUrl = buildWebhookUrl(webhookBaseUrl, taskId);
      console.log(
        `[${requestId}] 构建的Webhook URL: ${webhookUrl ? '[已生成]' : '[未生成]'}`
      );

      console.log(`[${requestId}] 调用AI服务创建预测...`);
      const prediction = await aiService.createPrediction({
        prompt: prompt,
        inputImages: inputImages,
        modelId: modelId,
        webhookUrl: webhookUrl,
      });
      console.log(`[${requestId}] AI服务响应:`, {
        predictionId: prediction.id,
        status: prediction.status,
        hasOutput: !!prediction.output,
        hasError: !!prediction.error,
      });

      // 更新任务记录，保存AI服务返回的预测ID
      console.log(`[${requestId}] 更新任务记录，保存预测ID: ${prediction.id}`);
      await db
        .update(aiPhotoTask)
        .set({
          taskId: prediction.id,
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(aiPhotoTask.id, taskId));
      console.log(`[${requestId}] 任务记录更新成功`);

      // 更新会话信息
      console.log(`[${requestId}] 更新会话信息...`);
      await db
        .update(aiPhotoSession)
        .set({
          taskCount: taskCount + 1,
          lastActivity: now,
          updatedAt: now,
          // 如果是第一个任务，更新会话标题
          ...(taskCount === 0 && {
            title:
              prompt.length > 10 ? prompt.substring(0, 10) + '...' : prompt,
            firstPrompt: prompt,
          }),
        })
        .where(eq(aiPhotoSession.id, sessionId));
      console.log(`[${requestId}] 会话信息更新成功`);

      console.log(`[${requestId}] 请求处理完成，返回成功响应`);
      return NextResponse.json({
        success: true,
        taskId: taskId,
      } as ProcessAIResponse);
    } catch (aiError) {
      console.error(`[${requestId}] AI服务调用失败:`, {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined,
      });

      // 更新任务状态为失败
      console.log(`[${requestId}] 更新任务状态为失败...`);
      try {
        await db
          .update(aiPhotoTask)
          .set({
            status: 'failed',
            errorMessage:
              aiError instanceof Error ? aiError.message : 'AI service error',
            updatedAt: new Date(),
          })
          .where(eq(aiPhotoTask.id, taskId));
        console.log(`[${requestId}] 任务状态更新为失败`);
      } catch (updateError) {
        console.error(`[${requestId}] 更新任务失败状态时出错:`, updateError);
      }

      return NextResponse.json(
        {
          success: false,
          error: 'AI服务调用失败，积分已扣除但任务未完成',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[${requestId}] 处理请求时发生未预期错误:`, {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
