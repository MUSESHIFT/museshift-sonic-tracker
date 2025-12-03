'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ncaClient from '../../lib/nca-client';

// ============================================
// STYLE PRESETS
// ============================================
const CAPTION_PRESETS = {
  museshift: {
    name: 'MuseShift Default',
    fontFamily: 'Inter',
    fontSize: 48,
    fontColor: 'white',
    backgroundColor: 'black',
    backgroundOpacity: 0.6,
    position: 'bottom',
  },
  instagram: {
    name: 'Instagram Reels',
    fontFamily: 'Montserrat',
    fontSize: 42,
    fontColor: 'white',
    backgroundColor: 'transparent',
    backgroundOpacity: 0,
    position: 'center',
  },
  tiktok: {
    name: 'TikTok Viral',
    fontFamily: 'Proxima Nova',
    fontSize: 52,
    fontColor: 'yellow',
    backgroundColor: 'black',
    backgroundOpacity: 0.8,
    position: 'center',
  },
  linkedin: {
    name: 'LinkedIn Professional',
    fontFamily: 'Arial',
    fontSize: 36,
    fontColor: 'white',
    backgroundColor: '#0077b5',
    backgroundOpacity: 0.9,
    position: 'bottom',
  },
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function NCAToolkit() {
  const [activeTab, setActiveTab] = useState('transcribe');
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Load jobs and templates from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedJobs = localStorage.getItem('nca_jobs');
      const savedTemplates = localStorage.getItem('nca_templates');
      if (savedJobs) setJobs(JSON.parse(savedJobs));
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  // Save jobs to localStorage
  const saveJob = (job) => {
    const updated = [job, ...jobs].slice(0, 100); // Keep last 100 jobs
    setJobs(updated);
    localStorage.setItem('nca_jobs', JSON.stringify(updated));
  };

  // Update job status
  const updateJob = (jobId, updates) => {
    const updated = jobs.map(j => j.id === jobId ? { ...j, ...updates } : j);
    setJobs(updated);
    localStorage.setItem('nca_jobs', JSON.stringify(updated));
  };

  // Save template
  const saveTemplate = (template) => {
    const updated = [...templates, { ...template, id: Date.now() }];
    setTemplates(updated);
    localStorage.setItem('nca_templates', JSON.stringify(updated));
  };

  const tabs = [
    { id: 'transcribe', label: 'TRANSCRIBE', icon: '>' },
    { id: 'caption', label: 'CAPTION', icon: '[]' },
    { id: 'tools', label: 'TOOLS', icon: '{}' },
    { id: 'queue', label: 'QUEUE', icon: '()' },
    { id: 'templates', label: 'TEMPLATES', icon: '<>' },
  ];

  return (
    <div className="min-h-screen bg-black text-green-400 p-4">
      {/* Header */}
      <div className="border-2 border-green-400 p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-wider glitch">NCA_TOOLKIT</h1>
            <p className="text-green-500 text-sm">content automation × media processing</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/"
              className="text-cyan-400 hover:text-cyan-300 border border-cyan-400 px-4 py-2 hover:bg-cyan-400/10"
            >
              ← back to terminal
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 text-xs mt-3 pt-3 border-t border-green-400/30">
          <span>{jobs.filter(j => j.status === 'processing').length} processing</span>
          <span>|</span>
          <span>{jobs.filter(j => j.status === 'complete').length} complete</span>
          <span>|</span>
          <span>{templates.length} templates</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-green-400/50 text-green-400/70 hover:border-green-400'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'transcribe' && (
          <TranscribeTab saveJob={saveJob} />
        )}
        {activeTab === 'caption' && (
          <CaptionTab saveJob={saveJob} templates={templates} />
        )}
        {activeTab === 'tools' && (
          <ToolsTab saveJob={saveJob} />
        )}
        {activeTab === 'queue' && (
          <QueueTab jobs={jobs} updateJob={updateJob} setJobs={setJobs} />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab templates={templates} setTemplates={setTemplates} saveTemplate={saveTemplate} />
        )}
      </div>
    </div>
  );
}

// ============================================
// TRANSCRIBE TAB
// ============================================
function TranscribeTab({ saveJob }) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [includeText, setIncludeText] = useState(true);
  const [includeSrt, setIncludeSrt] = useState(true);
  const [includeSegments, setIncludeSegments] = useState(false);
  const [maxWords, setMaxWords] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTranscribe = async () => {
    if (!mediaUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const jobId = 'transcribe_' + Date.now();

    // Save job to queue
    saveJob({
      id: jobId,
      type: 'transcribe',
      status: 'processing',
      inputUrl: mediaUrl,
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await ncaClient.transcribe({
        mediaUrl,
        includeText,
        includeSrt,
        includeSegments,
        maxWordsPerLine: maxWords,
      });

      setResult(response);

      // Update job with result
      saveJob({
        id: jobId,
        type: 'transcribe',
        status: 'complete',
        inputUrl: mediaUrl,
        outputUrls: response,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
      saveJob({
        id: jobId,
        type: 'transcribe',
        status: 'failed',
        inputUrl: mediaUrl,
        error: err.message,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">MEDIA INPUT</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-green-500 mb-2">Media URL (video or audio)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1 bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeText}
                onChange={(e) => setIncludeText(e.target.checked)}
                className="accent-green-400"
              />
              <span className="text-sm">Text transcript</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSrt}
                onChange={(e) => setIncludeSrt(e.target.checked)}
                className="accent-green-400"
              />
              <span className="text-sm">SRT file</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSegments}
                onChange={(e) => setIncludeSegments(e.target.checked)}
                className="accent-green-400"
              />
              <span className="text-sm">Segments</span>
            </label>
            <div>
              <label className="text-sm text-green-500">Max words/line</label>
              <input
                type="number"
                value={maxWords}
                onChange={(e) => setMaxWords(parseInt(e.target.value) || 5)}
                min={1}
                max={20}
                className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none focus:border-green-400"
              />
            </div>
          </div>

          <button
            onClick={handleTranscribe}
            disabled={loading || !mediaUrl.trim()}
            className="w-full px-4 py-3 border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '[ PROCESSING... ]' : '[ TRANSCRIBE ]'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-400 p-4 text-red-400">
          <p className="font-bold">ERROR</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border border-green-400/50 p-4">
          <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">TRANSCRIPTION RESULT</h2>

          {result.text && (
            <div className="mb-4">
              <label className="block text-sm text-green-500 mb-2">Transcript</label>
              <textarea
                readOnly
                value={result.text}
                className="w-full h-48 bg-black border border-green-400/30 p-3 text-green-300 text-sm resize-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(result.text)}
                className="mt-2 px-3 py-1 border border-green-400/50 text-sm hover:bg-green-400/10"
              >
                Copy Text
              </button>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {result.text_url && (
              <a
                href={result.text_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
              >
                Download .txt
              </a>
            )}
            {result.srt_url && (
              <a
                href={result.srt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
              >
                Download .srt
              </a>
            )}
            {result.segments_url && (
              <a
                href={result.segments_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
              >
                Download .json
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CAPTION TAB
// ============================================
function CaptionTab({ saveJob, templates }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [srtUrl, setSrtUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('museshift');
  const [customStyle, setCustomStyle] = useState(CAPTION_PRESETS.museshift);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    if (CAPTION_PRESETS[presetKey]) {
      setCustomStyle(CAPTION_PRESETS[presetKey]);
    }
  };

  const handleCaption = async () => {
    if (!videoUrl.trim() || !srtUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const jobId = 'caption_' + Date.now();

    saveJob({
      id: jobId,
      type: 'caption',
      status: 'processing',
      inputUrl: videoUrl,
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await ncaClient.addCaptions({
        videoUrl,
        srtUrl,
        ...customStyle,
      });

      setResult(response);

      saveJob({
        id: jobId,
        type: 'caption',
        status: 'complete',
        inputUrl: videoUrl,
        outputUrls: response,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
      saveJob({
        id: jobId,
        type: 'caption',
        status: 'failed',
        inputUrl: videoUrl,
        error: err.message,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">VIDEO & SUBTITLES</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-green-500 mb-2">Video URL</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="block text-sm text-green-500 mb-2">SRT File URL</label>
            <input
              type="text"
              value={srtUrl}
              onChange={(e) => setSrtUrl(e.target.value)}
              placeholder="https://example.com/subtitles.srt"
              className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
            />
          </div>
        </div>
      </div>

      {/* Style Presets */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">STYLE PRESETS</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(CAPTION_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`p-3 border text-left transition-colors ${
                selectedPreset === key
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-green-400/30 hover:border-green-400/60'
              }`}
            >
              <div className="font-bold text-sm">{preset.name}</div>
              <div className="text-xs text-green-600 mt-1">
                {preset.fontFamily} {preset.fontSize}px
              </div>
            </button>
          ))}
        </div>

        {/* Custom saved templates */}
        {templates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-green-400/30">
            <p className="text-sm text-green-500 mb-2">Your Templates:</p>
            <div className="flex gap-2 flex-wrap">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCustomStyle(t)}
                  className="px-3 py-1 border border-purple-400/50 text-purple-400 text-sm hover:bg-purple-400/10"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Style Editor */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">CUSTOM STYLE</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Family</label>
            <input
              type="text"
              value={customStyle.fontFamily}
              onChange={(e) => setCustomStyle({ ...customStyle, fontFamily: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Size</label>
            <input
              type="number"
              value={customStyle.fontSize}
              onChange={(e) => setCustomStyle({ ...customStyle, fontSize: parseInt(e.target.value) })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Color</label>
            <input
              type="text"
              value={customStyle.fontColor}
              onChange={(e) => setCustomStyle({ ...customStyle, fontColor: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Background Color</label>
            <input
              type="text"
              value={customStyle.backgroundColor}
              onChange={(e) => setCustomStyle({ ...customStyle, backgroundColor: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">BG Opacity (0-1)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={customStyle.backgroundOpacity}
              onChange={(e) => setCustomStyle({ ...customStyle, backgroundOpacity: parseFloat(e.target.value) })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Position</label>
            <select
              value={customStyle.position}
              onChange={(e) => setCustomStyle({ ...customStyle, position: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            >
              <option value="bottom">Bottom</option>
              <option value="center">Center</option>
              <option value="top">Top</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleCaption}
        disabled={loading || !videoUrl.trim() || !srtUrl.trim()}
        className="w-full px-4 py-3 border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '[ GENERATING CAPTIONS... ]' : '[ GENERATE CAPTIONS ]'}
      </button>

      {/* Error */}
      {error && (
        <div className="border border-red-400 p-4 text-red-400">
          <p className="font-bold">ERROR</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border border-green-400/50 p-4">
          <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">CAPTIONED VIDEO</h2>
          {result.video_url && (
            <a
              href={result.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
            >
              Download Captioned Video
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// TOOLS TAB
// ============================================
function ToolsTab({ saveJob }) {
  const [activeTool, setActiveTool] = useState('convert');

  return (
    <div className="space-y-6">
      {/* Tool Selector */}
      <div className="flex gap-2">
        {['convert', 'trim', 'thumbnail'].map(tool => (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`px-4 py-2 border transition-colors ${
              activeTool === tool
                ? 'border-orange-400 bg-orange-400/10 text-orange-400'
                : 'border-green-400/30 hover:border-green-400/60'
            }`}
          >
            {tool.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTool === 'convert' && <ConvertTool saveJob={saveJob} />}
      {activeTool === 'trim' && <TrimTool saveJob={saveJob} />}
      {activeTool === 'thumbnail' && <ThumbnailTool saveJob={saveJob} />}
    </div>
  );
}

function ConvertTool({ saveJob }) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleConvert = async () => {
    if (!mediaUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const jobId = 'convert_' + Date.now();

    saveJob({
      id: jobId,
      type: 'convert',
      status: 'processing',
      inputUrl: mediaUrl,
      metadata: { outputFormat },
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await ncaClient.convert({ mediaUrl, outputFormat });
      setResult(response);

      saveJob({
        id: jobId,
        type: 'convert',
        status: 'complete',
        inputUrl: mediaUrl,
        outputUrls: response,
        metadata: { outputFormat },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-green-400/50 p-4">
      <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">FORMAT CONVERTER</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-green-500 mb-2">Media URL</label>
          <input
            type="text"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
          />
        </div>

        <div>
          <label className="block text-sm text-green-500 mb-2">Output Format</label>
          <div className="flex gap-2">
            {['mp3', 'mp4', 'wav'].map(fmt => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                className={`px-4 py-2 border transition-colors ${
                  outputFormat === fmt
                    ? 'border-green-400 bg-green-400 text-black'
                    : 'border-green-400/50 hover:border-green-400'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConvert}
          disabled={loading || !mediaUrl.trim()}
          className="w-full px-4 py-3 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? '[ CONVERTING... ]' : '[ CONVERT ]'}
        </button>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {result?.output_url && (
          <a
            href={result.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
          >
            Download {outputFormat.toUpperCase()}
          </a>
        )}
      </div>
    </div>
  );
}

function TrimTool({ saveJob }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:05:00');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTrim = async () => {
    if (!videoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const jobId = 'trim_' + Date.now();

    saveJob({
      id: jobId,
      type: 'trim',
      status: 'processing',
      inputUrl: videoUrl,
      metadata: { startTime, endTime },
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await ncaClient.trim({ videoUrl, startTime, endTime });
      setResult(response);

      saveJob({
        id: jobId,
        type: 'trim',
        status: 'complete',
        inputUrl: videoUrl,
        outputUrls: response,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-green-400/50 p-4">
      <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">TRIM VIDEO</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-green-500 mb-2">Video URL</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-green-500 mb-2">Start Time</label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="00:00:00"
              className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-2">End Time</label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="00:05:00"
              className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 outline-none focus:border-green-400"
            />
          </div>
        </div>

        <button
          onClick={handleTrim}
          disabled={loading || !videoUrl.trim()}
          className="w-full px-4 py-3 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? '[ TRIMMING... ]' : '[ TRIM VIDEO ]'}
        </button>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {result?.output_url && (
          <a
            href={result.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
          >
            Download Trimmed Video
          </a>
        )}
      </div>
    </div>
  );
}

function ThumbnailTool({ saveJob }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [timestamp, setTimestamp] = useState('00:00:01');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExtract = async () => {
    if (!videoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const jobId = 'thumbnail_' + Date.now();

    saveJob({
      id: jobId,
      type: 'thumbnail',
      status: 'processing',
      inputUrl: videoUrl,
      metadata: { timestamp },
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await ncaClient.thumbnail({ videoUrl, timestamp });
      setResult(response);

      saveJob({
        id: jobId,
        type: 'thumbnail',
        status: 'complete',
        inputUrl: videoUrl,
        outputUrls: response,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-green-400/50 p-4">
      <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">EXTRACT THUMBNAIL</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-green-500 mb-2">Video URL</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-700 outline-none focus:border-green-400"
          />
        </div>

        <div>
          <label className="block text-sm text-green-500 mb-2">Timestamp</label>
          <input
            type="text"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            placeholder="00:00:01"
            className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 outline-none focus:border-green-400"
          />
        </div>

        <button
          onClick={handleExtract}
          disabled={loading || !videoUrl.trim()}
          className="w-full px-4 py-3 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? '[ EXTRACTING... ]' : '[ EXTRACT THUMBNAIL ]'}
        </button>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {result?.thumbnail_url && (
          <div className="space-y-2">
            <img
              src={result.thumbnail_url}
              alt="Thumbnail"
              className="max-w-xs border border-green-400/30"
            />
            <a
              href={result.thumbnail_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
            >
              Download Thumbnail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// QUEUE TAB
// ============================================
function QueueTab({ jobs, updateJob, setJobs }) {
  const clearCompleted = () => {
    const filtered = jobs.filter(j => j.status !== 'complete');
    setJobs(filtered);
    localStorage.setItem('nca_jobs', JSON.stringify(filtered));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'text-yellow-400 border-yellow-400';
      case 'complete': return 'text-green-400 border-green-400';
      case 'failed': return 'text-red-400 border-red-400';
      case 'queued': return 'text-blue-400 border-blue-400';
      default: return 'text-green-400 border-green-400';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'transcribe': return '>';
      case 'caption': return '[]';
      case 'convert': return '<>';
      case 'trim': return '{}';
      case 'thumbnail': return '()';
      default: return '*';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">PROCESSING QUEUE</h2>
        <button
          onClick={clearCompleted}
          className="px-3 py-1 border border-green-400/50 text-sm hover:bg-green-400/10"
        >
          Clear Completed
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-green-400/30 p-8 text-center">
          <p className="text-green-500">No jobs in queue</p>
          <p className="text-green-700 text-sm mt-2">Start processing media to see jobs here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="border border-green-400/30 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-400">{getTypeIcon(job.type)}</span>
                    <span className="font-bold">{job.type.toUpperCase()}</span>
                    <span className={`text-xs px-2 py-0.5 border ${getStatusColor(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-green-600 text-sm mt-1 truncate max-w-md">
                    {job.inputUrl}
                  </p>
                  <p className="text-green-700 text-xs mt-1">
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>

                {job.status === 'complete' && job.outputUrls && (
                  <div className="flex gap-2">
                    {Object.entries(job.outputUrls).map(([key, url]) => (
                      url && typeof url === 'string' && url.startsWith('http') && (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 border border-cyan-400 text-cyan-400 text-sm hover:bg-cyan-400/10"
                        >
                          {key.replace(/_/g, ' ')}
                        </a>
                      )
                    ))}
                  </div>
                )}

                {job.status === 'failed' && job.error && (
                  <span className="text-red-400 text-sm">{job.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// TEMPLATES TAB
// ============================================
function TemplatesTab({ templates, setTemplates, saveTemplate }) {
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    fontFamily: 'Inter',
    fontSize: 48,
    fontColor: 'white',
    backgroundColor: 'black',
    backgroundOpacity: 0.6,
    position: 'bottom',
  });

  const handleSave = () => {
    if (!newTemplate.name.trim()) return;
    saveTemplate(newTemplate);
    setNewTemplate({
      name: '',
      fontFamily: 'Inter',
      fontSize: 48,
      fontColor: 'white',
      backgroundColor: 'black',
      backgroundOpacity: 0.6,
      position: 'bottom',
    });
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('nca_templates', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      {/* Existing Templates */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">MY TEMPLATES</h2>

        {templates.length === 0 ? (
          <p className="text-green-600 text-sm">No custom templates yet</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="border border-green-400/30 p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold">{t.name}</p>
                  <p className="text-green-600 text-sm">
                    {t.fontFamily} {t.fontSize}px | {t.fontColor} on {t.backgroundColor}
                  </p>
                </div>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="px-3 py-1 border border-red-400/50 text-red-400 text-sm hover:bg-red-400/10"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Template */}
      <div className="border border-green-400/50 p-4">
        <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">+ NEW TEMPLATE</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 md:col-span-3">
            <label className="block text-sm text-green-500 mb-1">Template Name</label>
            <input
              type="text"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder="My Brand Style"
              className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Family</label>
            <input
              type="text"
              value={newTemplate.fontFamily}
              onChange={(e) => setNewTemplate({ ...newTemplate, fontFamily: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Size</label>
            <input
              type="number"
              value={newTemplate.fontSize}
              onChange={(e) => setNewTemplate({ ...newTemplate, fontSize: parseInt(e.target.value) })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Font Color</label>
            <input
              type="text"
              value={newTemplate.fontColor}
              onChange={(e) => setNewTemplate({ ...newTemplate, fontColor: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Background</label>
            <input
              type="text"
              value={newTemplate.backgroundColor}
              onChange={(e) => setNewTemplate({ ...newTemplate, backgroundColor: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">BG Opacity</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={newTemplate.backgroundOpacity}
              onChange={(e) => setNewTemplate({ ...newTemplate, backgroundOpacity: parseFloat(e.target.value) })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-green-500 mb-1">Position</label>
            <select
              value={newTemplate.position}
              onChange={(e) => setNewTemplate({ ...newTemplate, position: e.target.value })}
              className="w-full bg-black border border-green-400/50 px-2 py-1 text-green-400 outline-none"
            >
              <option value="bottom">Bottom</option>
              <option value="center">Center</option>
              <option value="top">Top</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!newTemplate.name.trim()}
          className="px-4 py-2 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
        >
          Save Template
        </button>
      </div>
    </div>
  );
}
