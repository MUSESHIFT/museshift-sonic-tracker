import { NextResponse } from 'next/server';

const NCA_BASE_URL = process.env.NCA_TOOLKIT_URL;
const NCA_API_KEY = process.env.NCA_API_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      mediaUrl,
      includeText = true,
      includeSrt = true,
      includeSegments = false,
      maxWordsPerLine = 5,
    } = body;

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400 });
    }

    if (!NCA_BASE_URL || !NCA_API_KEY) {
      return NextResponse.json({ error: 'NCA Toolkit not configured' }, { status: 500 });
    }

    const response = await fetch(`${NCA_BASE_URL}/v1/media/transcribe`, {
      method: 'POST',
      headers: {
        'x-api-key': NCA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_url: mediaUrl,
        task: 'transcribe',
        include_text: includeText,
        include_srt: includeSrt,
        include_segments: includeSegments,
        max_words_per_line: maxWordsPerLine,
        response_type: 'direct',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `NCA API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
