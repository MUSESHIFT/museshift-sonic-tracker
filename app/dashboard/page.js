'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// State metadata
const STATE_INFO = {
  slickveil: { color: '#a78bfa', label: 'Slickveil', description: 'smooth, controlled, mask on' },
  voltage: { color: '#f97316', label: 'Voltage', description: 'high energy, activated, ready' },
  fraymark: { color: '#ef4444', label: 'Fraymark', description: 'frayed, scattered, dysregulated' },
  clearmark: { color: '#4ade80', label: 'Clearmark', description: 'grounded, present, clear' },
  lowline: { color: '#3b82f6', label: 'Lowline', description: 'low energy, withdrawn, quiet' },
  other_place: { color: '#8b5cf6', label: 'Other Place', description: 'dissociated, elsewhere, floating' },
  SLICKVEIL: { color: '#a78bfa', label: 'Slickveil', description: 'smooth, controlled, mask on' },
  VOLTAGE: { color: '#f97316', label: 'Voltage', description: 'high energy, activated, ready' },
  FRAYMARK: { color: '#ef4444', label: 'Fraymark', description: 'frayed, scattered, dysregulated' },
  CLEARMARK: { color: '#4ade80', label: 'Clearmark', description: 'grounded, present, clear' },
  LOWLINE: { color: '#3b82f6', label: 'Lowline', description: 'low energy, withdrawn, quiet' },
  OTHER_PLACE: { color: '#8b5cf6', label: 'Other Place', description: 'dissociated, elsewhere, floating' },
};

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [airtableCheckins, setAirtableCheckins] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [timeRange, setTimeRange] = useState('today');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');

  // Fetch system status and Airtable data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch system status
        const statusRes = await fetch('/api/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSystemStatus(statusData);
        }

        // Fetch Airtable check-ins
        const checkinsRes = await fetch('/api/checkins?limit=50');
        if (checkinsRes.ok) {
          const checkinsData = await checkinsRes.json();
          setAirtableCheckins(checkinsData.checkins || []);
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load local sessions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('museshift_sessions');
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    const allData = activeTab === 'live' ? airtableCheckins : sessions;
    if (allData.length > 0) {
      calculateStats(allData);
    }
  }, [sessions, airtableCheckins, timeRange, activeTab]);

  const getFilteredData = (data) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return data.filter(s => {
      const sessionDate = new Date(s.timestamp);
      switch (timeRange) {
        case 'today':
          return sessionDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return sessionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return sessionDate >= monthAgo;
        case 'all':
        default:
          return true;
      }
    });
  };

  const calculateStats = (data) => {
    const filtered = getFilteredData(data);

    // State frequency - handle both local and Airtable formats
    const stateCounts = {};
    filtered.forEach(s => {
      const state = s.detected_state || s.detectedState;
      if (state) {
        const normalized = state.toLowerCase();
        stateCounts[normalized] = (stateCounts[normalized] || 0) + 1;
      }
    });

    // Emotion frequency
    const emotionCounts = {};
    filtered.forEach(s => {
      const emotion = s.emotion || s.detected_emotion;
      if (emotion) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    // Time of day analysis
    const hourCounts = {};
    filtered.forEach(s => {
      const hour = new Date(s.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Most common state
    const mostCommon = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Most common emotion
    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Source breakdown
    const sourceCounts = {};
    filtered.forEach(s => {
      const src = s.source || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    // Peak hour
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    setStats({
      totalCheckins: filtered.length,
      stateCounts,
      emotionCounts,
      sourceCounts,
      mostCommonState: mostCommon ? mostCommon[0] : null,
      dominantState: mostCommon ? mostCommon[0] : null,
      dominantEmotion: mostCommonEmotion ? mostCommonEmotion[0] : null,
      peakHour: peakHour ? parseInt(peakHour[0]) : null,
      hourCounts,
    });
  };

  const formatHour = (hour) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}${ampm}`;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStateColor = (state) => {
    if (!state) return '#4ade80';
    const info = STATE_INFO[state] || STATE_INFO[state.toLowerCase()] || STATE_INFO[state.toUpperCase()];
    return info?.color || '#4ade80';
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4">
      {/* Header with Status */}
      <div className="border-2 border-green-400 p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">MUSESHIFT_DASHBOARD</h1>
            <p className="text-green-500 text-sm">personal energy patterns</p>
            {/* Quick Stats Pills */}
            {airtableCheckins.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-cyan-400/20 border border-cyan-400/40 rounded-full text-xs text-cyan-300">
                  ✧ {airtableCheckins.length} check-ins
                </span>
                {airtableCheckins[0]?.detectedState && (
                  <span
                    className="px-2 py-1 rounded-full text-xs border"
                    style={{
                      backgroundColor: `${getStateColor(airtableCheckins[0].detectedState)}20`,
                      borderColor: `${getStateColor(airtableCheckins[0].detectedState)}60`,
                      color: getStateColor(airtableCheckins[0].detectedState)
                    }}
                  >
                    ◐ now: {airtableCheckins[0].detectedState}
                  </span>
                )}
                {stats?.dominantState && (
                  <span
                    className="px-2 py-1 rounded-full text-xs border"
                    style={{
                      backgroundColor: `${getStateColor(stats.dominantState)}20`,
                      borderColor: `${getStateColor(stats.dominantState)}60`,
                      color: getStateColor(stats.dominantState)
                    }}
                  >
                    ♡ vibe: {stats.dominantState}
                  </span>
                )}
                {stats?.dominantEmotion && (
                  <span className="px-2 py-1 bg-pink-400/20 border border-pink-400/40 rounded-full text-xs text-pink-300">
                    ꕤ feeling: {stats.dominantEmotion}
                  </span>
                )}
                {airtableCheckins[0]?.timestamp && (
                  <span className="px-2 py-1 bg-purple-400/20 border border-purple-400/40 rounded-full text-xs text-purple-300">
                    ⏱ {formatTimeAgo(airtableCheckins[0].timestamp)}
                  </span>
                )}
                {stats?.peakHour !== null && (
                  <span className="px-2 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-xs text-amber-300">
                    ☀ peak: {formatHour(stats.peakHour)}
                  </span>
                )}
                {stats?.sourceCounts?.personal > 0 && (
                  <span className="px-2 py-1 bg-green-400/20 border border-green-400/40 rounded-full text-xs text-green-300">
                    ✎ {stats.sourceCounts.personal} personal
                  </span>
                )}
                {stats?.sourceCounts?.sms > 0 && (
                  <span className="px-2 py-1 bg-blue-400/20 border border-blue-400/40 rounded-full text-xs text-blue-300">
                    ✉ {stats.sourceCounts.sms} sms
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* System Status Indicators */}
            <div className="text-xs space-y-1 text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-green-600">n8n:</span>
                <span className={systemStatus?.n8n?.status === 'connected' ? 'text-green-400' : 'text-red-400'}>
                  {systemStatus?.n8n?.status === 'connected' ? '● ONLINE' : '○ OFFLINE'}
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-green-600">SMS:</span>
                <span className={systemStatus?.n8n?.smsWorkflow === 'active' ? 'text-green-400' : 'text-yellow-400'}>
                  {systemStatus?.n8n?.smsWorkflow === 'active' ? '● ACTIVE' : '○ CHECK'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                className="text-cyan-400 hover:text-cyan-300 border border-cyan-400 px-4 py-1 hover:bg-cyan-400/10 text-sm"
              >
                ← terminal
              </Link>
              <Link
                href="/nca"
                className="text-purple-400 hover:text-purple-300 border border-purple-400 px-4 py-1 hover:bg-purple-400/10 text-sm"
              >
                NCA tools
              </Link>
            </div>
          </div>
        </div>

        {/* Current State Display */}
        {systemStatus?.currentState && (
          <div className="mt-4 pt-4 border-t border-green-400/30">
            <div className="flex items-center gap-4">
              <span className="text-green-600 text-sm">CURRENT STATE:</span>
              <span
                className="text-xl font-bold"
                style={{ color: getStateColor(systemStatus.currentState.state) }}
              >
                {systemStatus.currentState.state}
              </span>
              <span className="text-green-500 text-sm">
                {systemStatus.currentState.phase}
              </span>
            </div>
            <p className="text-green-600 text-sm mt-1 italic">
              "{systemStatus.currentState.essence}"
            </p>
          </div>
        )}
      </div>

      {/* Data Source Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 border transition-colors ${
            activeTab === 'live'
              ? 'border-cyan-400 bg-cyan-400 text-black'
              : 'border-cyan-400/50 text-cyan-400/70 hover:border-cyan-400'
          }`}
        >
          LIVE (SMS/Voice)
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`px-4 py-2 border transition-colors ${
            activeTab === 'local'
              ? 'border-green-400 bg-green-400 text-black'
              : 'border-green-400/50 text-green-400/70 hover:border-green-400'
          }`}
        >
          LOCAL (Web App)
        </button>
      </div>

      {/* Time range selector */}
      <div className="flex gap-2 mb-6">
        {['today', 'week', 'month', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 border transition-colors ${
              timeRange === range
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-green-400/50 text-green-400/70 hover:border-green-400'
            }`}
          >
            {range.toUpperCase()}
          </button>
        ))}
        {loading && <span className="text-yellow-400 animate-pulse ml-4 self-center">loading...</span>}
      </div>

      {(!stats || stats.totalCheckins === 0) && !loading ? (
        <div className="border border-green-400/30 p-8 text-center">
          <p className="text-green-500 text-lg mb-4">No data for this time range</p>
          <p className="text-green-600 text-sm">
            {activeTab === 'live'
              ? 'Send a text or voice memo to your MuseShift number'
              : 'Start tracking your states on the main terminal'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Latest Check-ins (Airtable data) */}
          {activeTab === 'live' && airtableCheckins.length > 0 && (
            <div className="border border-cyan-400/50 p-4 rounded">
              <h2 className="text-lg font-bold mb-4 border-b border-cyan-400/30 pb-2 text-cyan-400">
                LATEST CHECK-INS
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {getFilteredData(airtableCheckins).slice(0, 10).map((checkin, i) => (
                  <div
                    key={checkin.id || i}
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: `${getStateColor(checkin.detectedState)}15`,
                      borderLeft: `3px solid ${getStateColor(checkin.detectedState)}`
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{checkin.glyph || '●'}</span>
                        <span
                          className="text-xs font-bold uppercase"
                          style={{ color: getStateColor(checkin.detectedState) }}
                        >
                          {checkin.detectedState || 'unknown'}
                        </span>
                        {checkin.emotion && (
                          <span className="text-purple-400/70 text-xs">
                            · {checkin.emotion}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs">
                        {formatTimeAgo(checkin.timestamp)}
                      </span>
                    </div>

                    {/* Message content */}
                    {checkin.feeling && (
                      <p className="text-gray-300 text-sm mb-1 truncate">
                        {checkin.feeling}
                      </p>
                    )}
                    {checkin.summary && (
                      <p className="text-cyan-400/80 text-xs truncate">
                        → {checkin.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overview Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-green-400/50 p-4">
                <div className="text-3xl font-bold">{stats.totalCheckins}</div>
                <div className="text-green-500 text-sm">check-ins</div>
              </div>
              <div className="border border-green-400/50 p-4">
                <div className="text-3xl font-bold">{Object.keys(stats.stateCounts).length}</div>
                <div className="text-green-500 text-sm">states visited</div>
              </div>
              <div className="border border-green-400/50 p-4">
                <div className="text-3xl font-bold">{Object.keys(stats.emotionCounts || {}).length}</div>
                <div className="text-green-500 text-sm">emotions detected</div>
              </div>
              <div className="border border-green-400/50 p-4">
                <div
                  className="text-xl font-bold capitalize"
                  style={{ color: getStateColor(stats.mostCommonState) }}
                >
                  {stats.mostCommonState || '—'}
                </div>
                <div className="text-green-500 text-sm">dominant state</div>
              </div>
            </div>
          )}

          {/* State Distribution */}
          {stats && Object.keys(stats.stateCounts).length > 0 && (
            <div className="border border-green-400/50 p-4">
              <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">STATE DISTRIBUTION</h2>
              <div className="space-y-3">
                {Object.entries(stats.stateCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([state, count]) => {
                    const percentage = Math.round((count / stats.totalCheckins) * 100);
                    return (
                      <div key={state} className="flex items-center gap-4">
                        <div className="w-24 text-sm capitalize" style={{ color: getStateColor(state) }}>
                          {state}
                        </div>
                        <div className="flex-1 h-6 bg-green-400/10 relative">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getStateColor(state)
                            }}
                          />
                          <span className="absolute right-2 top-0 text-xs text-black mix-blend-difference">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Emotion Distribution */}
          {stats && stats.emotionCounts && Object.keys(stats.emotionCounts).length > 0 && (
            <div className="border border-purple-400/50 p-4">
              <h2 className="text-lg font-bold mb-4 border-b border-purple-400/30 pb-2 text-purple-400">
                EMOTION DISTRIBUTION
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.emotionCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([emotion, count]) => (
                    <span
                      key={emotion}
                      className="px-3 py-1 border border-purple-400/50 text-purple-300 text-sm"
                    >
                      {emotion} ({count})
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Time of Day Pattern */}
          {stats && Object.keys(stats.hourCounts).length > 0 && (
            <div className="border border-green-400/50 p-4">
              <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">ACTIVITY BY HOUR</h2>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }, (_, i) => {
                  const count = stats.hourCounts[i] || 0;
                  const maxCount = Math.max(...Object.values(stats.hourCounts), 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-green-400 transition-all hover:bg-green-300"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                        title={`${formatHour(i)}: ${count} sessions`}
                      />
                      {i % 4 === 0 && (
                        <span className="text-[10px] text-green-600 mt-1">{formatHour(i)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Local session history (only show when on local tab) */}
          {activeTab === 'local' && sessions.length > 0 && (
            <div className="border border-green-400/50 p-4">
              <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">LOCAL SESSIONS</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getFilteredData(sessions)
                  .slice(-20)
                  .reverse()
                  .map((session, i) => {
                    const stateInfo = STATE_INFO[session.detected_state];
                    return (
                      <div key={i} className="flex items-center gap-4 text-sm border-b border-green-400/10 pb-2">
                        <span className="text-green-600 w-32">
                          {new Date(session.timestamp).toLocaleString()}
                        </span>
                        {session.detected_state && (
                          <span
                            className="px-2 py-1 text-xs"
                            style={{
                              color: stateInfo?.color || '#4ade80',
                              borderColor: stateInfo?.color || '#4ade80',
                              border: '1px solid'
                            }}
                          >
                            {session.detected_state}
                          </span>
                        )}
                        {session.target_state && (
                          <>
                            <span className="text-green-600">→</span>
                            <span
                              className="text-xs"
                              style={{ color: STATE_INFO[session.target_state]?.color }}
                            >
                              {session.target_state}
                            </span>
                          </>
                        )}
                        {session.playlist_generated && (
                          <span className="text-cyan-400 text-xs">playlist</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
