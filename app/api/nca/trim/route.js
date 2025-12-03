import { NextResponse } from 'next/server';

const NCA_BASE_URL = process.env.NCA_TOOLKIT_URL;
const NCA_API_KEY = process.env.NCA_API_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, startTime, endTime } = body;

    if (!videoUrl || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'videoUrl, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    if (!NCA_BASE_URL || !NCA_API_KEY) {
      return NextResponse.json({ error: 'NCA Toolkit not configured' }, { status: 500 });
    }

    const response = await fetch(`${NCA_BASE_URL}/v1/video/trim`, {
      method: 'POST',
      headers: {
        'x-api-key': NCA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        start_time: startTime,
        end_time: endTime,
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
    console.error('Trim error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
