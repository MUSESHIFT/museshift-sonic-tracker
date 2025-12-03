// NCA Toolkit API Client
// https://github.com/stephengpope/no-code-architects-toolkit

const NCA_BASE_URL = process.env.NEXT_PUBLIC_NCA_TOOLKIT_URL || '';
const NCA_API_KEY = process.env.NCA_API_KEY || '';

// Generate UUID for job tracking
export function generateJobId() {
  return 'nca_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Base fetch wrapper with auth
async function ncaFetch(endpoint, options = {}) {
  const url = `${NCA_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': NCA_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NCA API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ============================================
// TRANSCRIPTION
// ============================================

export async function transcribe({
  mediaUrl,
  includeText = true,
  includeSrt = true,
  includeSegments = false,
  maxWordsPerLine = 5,
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/media/transcribe', {
    method: 'POST',
    body: JSON.stringify({
      media_url: mediaUrl,
      task: 'transcribe',
      include_text: includeText,
      include_srt: includeSrt,
      include_segments: includeSegments,
      max_words_per_line: maxWordsPerLine,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

// ============================================
// CAPTIONS
// ============================================

export async function addCaptions({
  videoUrl,
  srtUrl,
  fontSize = 48,
  fontColor = 'white',
  fontFamily = 'Inter',
  backgroundColor = 'black',
  backgroundOpacity = 0.6,
  position = 'bottom',
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/video/caption', {
    method: 'POST',
    body: JSON.stringify({
      video_url: videoUrl,
      srt_url: srtUrl,
      font_size: fontSize,
      font_color: fontColor,
      font_family: fontFamily,
      background_color: backgroundColor,
      background_opacity: backgroundOpacity,
      position: position,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

// ============================================
// VIDEO TOOLS
// ============================================

export async function convertToMp3({
  mediaUrl,
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/convert/mp3', {
    method: 'POST',
    body: JSON.stringify({
      media_url: mediaUrl,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

export async function convertMedia({
  mediaUrl,
  outputFormat = 'mp4',
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/media/convert', {
    method: 'POST',
    body: JSON.stringify({
      media_url: mediaUrl,
      output_format: outputFormat,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

export async function trimVideo({
  videoUrl,
  startTime,
  endTime,
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/video/trim', {
    method: 'POST',
    body: JSON.stringify({
      video_url: videoUrl,
      start_time: startTime,
      end_time: endTime,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

export async function extractThumbnail({
  videoUrl,
  timestamp = '00:00:01',
  webhookUrl = null,
  jobId = null,
}) {
  const id = jobId || generateJobId();

  return ncaFetch('/v1/video/thumbnail', {
    method: 'POST',
    body: JSON.stringify({
      video_url: videoUrl,
      timestamp: timestamp,
      response_type: webhookUrl ? 'cloud' : 'direct',
      webhook_url: webhookUrl,
      id: id,
    }),
  });
}

// ============================================
// JOB STATUS
// ============================================

export async function getJobStatus(jobId) {
  return ncaFetch(`/v1/jobs/status/${jobId}`, {
    method: 'GET',
  });
}

// ============================================
// CLIENT-SIDE HELPERS (for use in React components)
// ============================================

// These call our Next.js API routes instead of NCA directly
// This keeps API keys server-side

export const ncaClient = {
  async transcribe(params) {
    const res = await fetch('/api/nca/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async addCaptions(params) {
    const res = await fetch('/api/nca/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async convert(params) {
    const res = await fetch('/api/nca/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async trim(params) {
    const res = await fetch('/api/nca/trim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async thumbnail(params) {
    const res = await fetch('/api/nca/thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getJobs() {
    const res = await fetch('/api/nca/jobs');
    return res.json();
  },

  async getJobStatus(jobId) {
    const res = await fetch(`/api/nca/jobs/${jobId}`);
    return res.json();
  },
};

export default ncaClient;
