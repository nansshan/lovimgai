import { randomUUID } from 'crypto';
import { createAIService } from '@/ai/image/lib/ai-service-factory';
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
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 解析请求体
    const body: ProcessAIRequest = await request.json();
    const { sessionId, prompt, inputImages, modelId } = body;

    // 验证必要参数
    if (!sessionId || !prompt || !modelId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 验证会话是否属于当前用户
    const db = await getDb();
    const sessionData = await db
      .select()
      .from(aiPhotoSession)
      .where(
        and(eq(aiPhotoSession.id, sessionId), eq(aiPhotoSession.userId, userId))
      )
      .limit(1);

    if (sessionData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // 获取模型配置
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json(
        { success: false, error: 'Invalid model' },
        { status: 400 }
      );
    }

    // 检查用户积分
    const userCredits = await getUserCredits(userId);
    if (userCredits < modelConfig.creditsPerUse) {
      return NextResponse.json(
        {
          success: false,
          error: `积分不足，需要 ${modelConfig.creditsPerUse} 积分，当前余额 ${userCredits} 积分`,
        },
        { status: 400 }
      );
    }

    // 扣减积分（失败不回滚）
    try {
      await consumeCredits({
        userId,
        amount: modelConfig.creditsPerUse,
        description: `AI图片生成 - ${modelConfig.name}`,
      });
    } catch (error) {
      console.error('Credits consumption error:', error);
      return NextResponse.json(
        { success: false, error: '积分扣减失败' },
        { status: 500 }
      );
    }

    // 创建任务记录
    const taskId = randomUUID();
    const now = new Date();

    // 获取当前会话的任务数量，用于设置序列号
    const taskCount = await db
      .select({ count: aiPhotoTask.sequenceOrder })
      .from(aiPhotoTask)
      .where(eq(aiPhotoTask.sessionId, sessionId))
      .orderBy(aiPhotoTask.sequenceOrder)
      .then((results) => results.length);

    // 插入任务记录
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

    // 调用AI服务
    try {
      const aiService = createAIService('replicate');
      const webhookUrl = process.env.WEBHOOK_URL
        ? `${process.env.WEBHOOK_URL}?taskId=${taskId}`
        : undefined;

      const prediction = await aiService.createPrediction({
        prompt: prompt,
        inputImages: inputImages,
        modelId: modelId,
        webhookUrl: webhookUrl,
      });

      // 更新任务记录，保存AI服务返回的预测ID
      await db
        .update(aiPhotoTask)
        .set({
          taskId: prediction.id,
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(aiPhotoTask.id, taskId));

      // 更新会话信息
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

      return NextResponse.json({
        success: true,
        taskId: taskId,
      } as ProcessAIResponse);
    } catch (aiError) {
      console.error('AI service error:', aiError);

      // 更新任务状态为失败
      await db
        .update(aiPhotoTask)
        .set({
          status: 'failed',
          errorMessage:
            aiError instanceof Error ? aiError.message : 'AI service error',
          updatedAt: new Date(),
        })
        .where(eq(aiPhotoTask.id, taskId));

      return NextResponse.json(
        {
          success: false,
          error: 'AI服务调用失败，积分已扣除但任务未完成',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Process AI request error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
