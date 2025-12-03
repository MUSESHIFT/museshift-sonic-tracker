import { NextResponse } from 'next/server';

const NCA_BASE_URL = process.env.NCA_TOOLKIT_URL;
const NCA_API_KEY = process.env.NCA_API_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      videoUrl,
      srtUrl,
      fontSize = 48,
      fontColor = 'white',
      fontFamily = 'Inter',
      backgroundColor = 'black',
      backgroundOpacity = 0.6,
      position = 'bottom',
    } = body;

    if (!videoUrl || !srtUrl) {
      return NextResponse.json({ error: 'videoUrl and srtUrl are required' }, { status: 400 });
    }

    if (!NCA_BASE_URL || !NCA_API_KEY) {
      return NextResponse.json({ error: 'NCA Toolkit not configured' }, { status: 500 });
    }

    const response = await fetch(`${NCA_BASE_URL}/v1/video/caption`, {
      method: 'POST',
      headers: {
        'x-api-key': NCA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        srt_url: srtUrl,
        font_size: fontSize,
        font_color: fontColor,
        font_family: fontFamily,
        background_color: backgroundColor,
        background_opacity: backgroundOpacity,
        position: position,
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
    console.error('Caption error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
