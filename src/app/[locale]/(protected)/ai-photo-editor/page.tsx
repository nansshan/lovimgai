import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { getTranslations } from 'next-intl/server';

/**
 * AI Photo Editor page
 *
 * This page provides AI-powered image generation and editing capabilities
 * with a three-column layout: sidebar + chat interface + image preview
 */
export default async function AIPhotoEditorPage() {
  const t = await getTranslations('Dashboard.aiPhotoEditor');

  const breadcrumbs = [
    {
      label: t('title'),
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="min-h-[600px] rounded-lg border border-dashed border-muted-foreground/25 p-8">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="size-8 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{t('title')}</h3>
                    <p className="text-muted-foreground">{t('description')}</p>
                    <p className="text-sm text-muted-foreground">
                      正在开发中，敬请期待...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
