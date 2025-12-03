import { NextResponse } from 'next/server';

const NCA_BASE_URL = process.env.NCA_TOOLKIT_URL;
const NCA_API_KEY = process.env.NCA_API_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { mediaUrl, outputFormat = 'mp3' } = body;

    if (!mediaUrl) {
      return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400 });
    }

    if (!NCA_BASE_URL || !NCA_API_KEY) {
      return NextResponse.json({ error: 'NCA Toolkit not configured' }, { status: 500 });
    }

    // Use specific endpoint for mp3, general convert for others
    const endpoint = outputFormat === 'mp3'
      ? '/v1/convert/mp3'
      : '/v1/media/convert';

    const requestBody = outputFormat === 'mp3'
      ? { media_url: mediaUrl, response_type: 'direct' }
      : { media_url: mediaUrl, output_format: outputFormat, response_type: 'direct' };

    const response = await fetch(`${NCA_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': NCA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    console.error('Convert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
