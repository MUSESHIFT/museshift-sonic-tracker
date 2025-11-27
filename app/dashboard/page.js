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
};

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [timeRange, setTimeRange] = useState('today');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('museshift_sessions');
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStats();
    }
  }, [sessions, timeRange]);

  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sessions.filter(s => {
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

  const calculateStats = () => {
    const filtered = getFilteredSessions();

    // State frequency
    const stateCounts = {};
    const stateTransitions = [];
    let prevState = null;

    filtered.forEach(s => {
      if (s.detected_state) {
        stateCounts[s.detected_state] = (stateCounts[s.detected_state] || 0) + 1;

        if (prevState && s.target_state) {
          stateTransitions.push({
            from: prevState,
            to: s.target_state,
            timestamp: s.timestamp
          });
        }
        prevState = s.detected_state;
      }
    });

    // Playlist stats
    const playlists = filtered.filter(s => s.playlist_generated);
    const avgDuration = playlists.length > 0
      ? playlists.reduce((sum, p) => sum + (p.duration || 0), 0) / playlists.length
      : 0;
    const avgDiscovery = playlists.length > 0
      ? playlists.reduce((sum, p) => sum + (p.discovery || 0), 0) / playlists.length
      : 0;

    // Time of day analysis
    const hourCounts = {};
    filtered.forEach(s => {
      const hour = new Date(s.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Most common state
    const mostCommon = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Daily breakdown for week/month view
    const dailyBreakdown = {};
    filtered.forEach(s => {
      const day = new Date(s.timestamp).toLocaleDateString();
      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = { states: [], playlists: 0 };
      }
      if (s.detected_state) {
        dailyBreakdown[day].states.push(s.detected_state);
      }
      if (s.playlist_generated) {
        dailyBreakdown[day].playlists++;
      }
    });

    setStats({
      totalCheckins: filtered.filter(s => s.detected_state).length,
      totalPlaylists: playlists.length,
      stateCounts,
      mostCommonState: mostCommon ? mostCommon[0] : null,
      avgDuration: Math.round(avgDuration),
      avgDiscovery: Math.round(avgDiscovery),
      hourCounts,
      stateTransitions,
      dailyBreakdown
    });
  };

  const clearData = () => {
    if (confirm('Clear all session data? This cannot be undone.')) {
      localStorage.removeItem('museshift_sessions');
      setSessions([]);
      setStats(null);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `museshift-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHour = (hour) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}${ampm}`;
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4">
      {/* Header */}
      <div className="border-2 border-green-400 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">MUSESHIFT_DASHBOARD</h1>
            <p className="text-green-500 text-sm">personal energy patterns</p>
          </div>
          <Link
            href="/"
            className="text-cyan-400 hover:text-cyan-300 border border-cyan-400 px-4 py-2 hover:bg-cyan-400/10"
          >
            ← back to terminal
          </Link>
        </div>
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
      </div>

      {!stats || stats.totalCheckins === 0 ? (
        <div className="border border-green-400/30 p-8 text-center">
          <p className="text-green-500 text-lg mb-4">No data for this time range</p>
          <p className="text-green-600 text-sm">Start tracking your states on the main terminal</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-green-400/50 p-4">
              <div className="text-3xl font-bold">{stats.totalCheckins}</div>
              <div className="text-green-500 text-sm">state checks</div>
            </div>
            <div className="border border-green-400/50 p-4">
              <div className="text-3xl font-bold">{stats.totalPlaylists}</div>
              <div className="text-green-500 text-sm">playlists generated</div>
            </div>
            <div className="border border-green-400/50 p-4">
              <div className="text-3xl font-bold">{stats.avgDuration || '—'}</div>
              <div className="text-green-500 text-sm">avg duration (min)</div>
            </div>
            <div className="border border-green-400/50 p-4">
              <div className="text-3xl font-bold">{stats.avgDiscovery || '—'}%</div>
              <div className="text-green-500 text-sm">avg discovery</div>
            </div>
          </div>

          {/* State Distribution */}
          <div className="border border-green-400/50 p-4">
            <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">STATE DISTRIBUTION</h2>
            <div className="space-y-3">
              {Object.entries(stats.stateCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([state, count]) => {
                  const info = STATE_INFO[state] || { color: '#4ade80', label: state };
                  const percentage = Math.round((count / stats.totalCheckins) * 100);
                  return (
                    <div key={state} className="flex items-center gap-4">
                      <div className="w-24 text-sm" style={{ color: info.color }}>
                        {info.label}
                      </div>
                      <div className="flex-1 h-6 bg-green-400/10 relative">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: info.color
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

          {/* Time of Day Pattern */}
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

          {/* Recent Sessions */}
          <div className="border border-green-400/50 p-4">
            <h2 className="text-lg font-bold mb-4 border-b border-green-400/30 pb-2">RECENT SESSIONS</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getFilteredSessions()
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
                        <span className="text-cyan-400 text-xs">🎵 playlist</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Most Common State */}
          {stats.mostCommonState && (
            <div className="border border-green-400/50 p-4">
              <h2 className="text-lg font-bold mb-2">DOMINANT STATE</h2>
              <div className="flex items-center gap-4">
                <span
                  className="text-3xl font-bold"
                  style={{ color: STATE_INFO[stats.mostCommonState]?.color }}
                >
                  {STATE_INFO[stats.mostCommonState]?.label || stats.mostCommonState}
                </span>
                <span className="text-green-500 text-sm">
                  {STATE_INFO[stats.mostCommonState]?.description}
                </span>
              </div>
            </div>
          )}

          {/* Data Management */}
          <div className="border border-green-400/30 p-4 flex gap-4">
            <button
              onClick={exportData}
              className="px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 text-sm"
            >
              EXPORT DATA (JSON)
            </button>
            <button
              onClick={clearData}
              className="px-4 py-2 border border-red-400 text-red-400 hover:bg-red-400/10 text-sm"
            >
              CLEAR ALL DATA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
