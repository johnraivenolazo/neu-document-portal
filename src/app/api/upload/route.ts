import { handleUpload, HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (_pathname) => {
                // Simple security check: Siguraduhin na PDF lang ang uploaded
                return {
                    allowedContentTypes: ['application/pdf'],
                    tokenPayload: JSON.stringify({
                        // optional: pwede kang magdagdag ng user ID dito
                    }),
                };
            },
            onUploadCompleted: async ({ blob: _blob, tokenPayload: _tokenPayload }) => {
                // Dito pwede kang mag-log pagkatapos ng upload
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error('Vercel Blob Upload Error:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
