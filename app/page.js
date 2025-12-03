'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// State color mapping
const STATE_COLORS = {
  slickveil: 'text-purple-400 border-purple-400',
  voltage: 'text-orange-400 border-orange-400',
  fraymark: 'text-red-400 border-red-400',
  clearmark: 'text-green-400 border-green-400',
  lowline: 'text-blue-400 border-blue-400',
  other_place: 'text-violet-400 border-violet-400',
};

export default function MuseShift() {
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [pathways, setPathways] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('loading');
  const [sessions, setSessions] = useState([]);
  const [todayStats, setTodayStats] = useState({ states: [], playlists: 0 });
  const messagesEndRef = useRef(null);

  const webhookBase = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'http://localhost:5678/webhook';
  const spotifyClientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/callback' : '';

  // Load sessions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSessions = localStorage.getItem('museshift_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        updateTodayStats(parsed);
      }
    }
  }, []);

  // Check for Spotify callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          setSpotifyToken(token);
          localStorage.setItem('spotify_token', token);
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchSpotifyUser(token);
          return;
        }
      }

      // Check for existing token
      const savedToken = localStorage.getItem('spotify_token');
      if (savedToken) {
        setSpotifyToken(savedToken);
        fetchSpotifyUser(savedToken);
      } else {
        setStage('spotify');
      }
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateTodayStats = (allSessions) => {
    const today = new Date().toDateString();
    const todaySessions = allSessions.filter(s =>
      new Date(s.timestamp).toDateString() === today
    );

    const states = todaySessions.map(s => s.detected_state).filter(Boolean);
    const playlists = todaySessions.filter(s => s.playlist_generated).length;

    setTodayStats({ states, playlists });
  };

  const saveSession = (data) => {
    const session = {
      ...data,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    const updated = [...sessions, session];
    setSessions(updated);
    localStorage.setItem('museshift_sessions', JSON.stringify(updated));
    updateTodayStats(updated);
  };

  const fetchSpotifyUser = async (token) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setSpotifyUser(user);
        setStage('ready');
        setMessages([
          { type: 'system', text: 'MUSESHIFT PERSONAL PROTOCOL ONLINE' },
          { type: 'system', text: `connected as: ${user.display_name || user.id}` },
          { type: 'system', text: `today: ${todayStats.states.length} state checks | ${todayStats.playlists} playlists` },
          { type: 'system', text: 'describe your state or type \'help\' for commands' }
        ]);
      } else {
        localStorage.removeItem('spotify_token');
        setSpotifyToken(null);
        setStage('spotify');
      }
    } catch (e) {
      console.error('Failed to fetch Spotify user', e);
      setStage('spotify');
    }
  };

  const connectSpotify = () => {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-recently-played'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

    window.location.href = authUrl;
  };

  const addMessage = (type, text, meta = {}) => {
    setMessages(prev => [...prev, { type, text, timestamp: Date.now(), ...meta }]);
  };

  const detectState = async () => {
    if (!input.trim()) return;

    setLoading(true);
    addMessage('user', input);

    try {
      const response = await fetch(`${webhookBase}/stateshift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: input,
          context: '',
          capacity: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Save to session history
      saveSession({
        user_input: input,
        detected_state: data.detected_state,
        reasoning: data.reasoning,
        pathway_count: data.pathway_options?.length || 0
      });

      addMessage('state', `STATE DETECTED: ${data.detected_state.toUpperCase()}`, {
        state: data.detected_state
      });
      addMessage('system', data.reasoning);
      addMessage('system', '\nAVAILABLE PATHWAYS:');

      data.pathway_options.forEach((pathway, i) => {
        addMessage('pathway',
          `${i + 1}. ${pathway.target_state.toUpperCase()}\n` +
          `   ${pathway.pathway}\n` +
          `   ${pathway.physical_effect}\n` +
          `   duration: ${pathway.duration}` +
          (pathway.warning ? `\n   warning: ${pathway.warning}` : ''),
          { target_state: pathway.target_state }
        );
      });

      addMessage('system', '\ntype pathway number + optional params:');
      addMessage('system', 'examples: "1" or "1, 45 min, 95% new" or "2, all new"');

      setPathways(data);
      setInput('');
    } catch (error) {
      addMessage('error', `CONNECTION FAILED: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePlaylist = async (choice) => {
    if (!pathways || !spotifyToken || !spotifyUser) return;

    setLoading(true);

    const parts = choice.split(',').map(p => p.trim());
    const pathwayIndex = parseInt(parts[0]) - 1;

    if (pathwayIndex < 0 || pathwayIndex >= pathways.pathway_options.length) {
      addMessage('error', 'INVALID PATHWAY NUMBER');
      setLoading(false);
      return;
    }

    const selectedPathway = pathways.pathway_options[pathwayIndex];

    let duration = 40;
    let discovery = 90;

    parts.forEach(part => {
      if (part.includes('min')) {
        duration = parseInt(part);
      }
      if (part.includes('%') || part.includes('new')) {
        const match = part.match(/(\d+)/);
        if (match) discovery = parseInt(match[1]);
        if (part.includes('all new')) discovery = 100;
      }
    });

    addMessage('user', `generating: ${pathways.detected_state} → ${selectedPathway.target_state}, ${duration} min, ${discovery}% discovery`);

    try {
      const response = await fetch(`${webhookBase}/stateshift/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_state: pathways.detected_state,
          target_state: selectedPathway.target_state,
          duration: duration,
          discovery_percentage: discovery,
          spotify_user_id: spotifyUser.id,
          spotify_access_token: spotifyToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.text();

      // Save playlist generation to session
      saveSession({
        source_state: pathways.detected_state,
        target_state: selectedPathway.target_state,
        duration,
        discovery,
        playlist_generated: true,
        playlist_result: result
      });

      addMessage('system', '\nPLAYLIST GENERATED:');
      addMessage('playlist', result);

      setPathways(null);
      setInput('');
    } catch (error) {
      addMessage('error', `GENERATION FAILED: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (input.toLowerCase() === 'help') {
      addMessage('system', 'COMMANDS:');
      addMessage('system', '• describe your state (freeform text)');
      addMessage('system', '• "stats" - view your daily patterns');
      addMessage('system', '• "clear" - reset conversation');
      addMessage('system', '• "logout" - disconnect Spotify');
      setInput('');
      return;
    }

    if (input.toLowerCase() === 'stats') {
      const today = new Date().toDateString();
      const todaySessions = sessions.filter(s =>
        new Date(s.timestamp).toDateString() === today
      );

      addMessage('system', `\n=== TODAY'S STATS (${today}) ===`);
      addMessage('system', `State checks: ${todaySessions.filter(s => s.detected_state).length}`);
      addMessage('system', `Playlists generated: ${todaySessions.filter(s => s.playlist_generated).length}`);

      const stateCounts = {};
      todaySessions.forEach(s => {
        if (s.detected_state) {
          stateCounts[s.detected_state] = (stateCounts[s.detected_state] || 0) + 1;
        }
      });

      if (Object.keys(stateCounts).length > 0) {
        addMessage('system', '\nState breakdown:');
        Object.entries(stateCounts).forEach(([state, count]) => {
          addMessage('state', `  ${state}: ${count}x`, { state });
        });
      }

      setInput('');
      return;
    }

    if (input.toLowerCase() === 'clear') {
      setMessages([
        { type: 'system', text: 'MUSESHIFT PERSONAL PROTOCOL ONLINE' },
        { type: 'system', text: `connected as: ${spotifyUser?.display_name || spotifyUser?.id}` },
        { type: 'system', text: 'describe your state or type \'help\' for commands' }
      ]);
      setPathways(null);
      setInput('');
      return;
    }

    if (input.toLowerCase() === 'logout') {
      localStorage.removeItem('spotify_token');
      setSpotifyToken(null);
      setSpotifyUser(null);
      setStage('spotify');
      setMessages([]);
      setInput('');
      return;
    }

    if (pathways && /^\d+/.test(input)) {
      generatePlaylist(input);
      return;
    }

    detectState();
  };

  // Loading state
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center">
        <div className="animate-pulse text-xl">[ INITIALIZING... ]</div>
      </div>
    );
  }

  // Spotify Connect Screen
  if (stage === 'spotify') {
    return (
      <div className="min-h-screen bg-black text-green-400 p-4 flex flex-col items-center justify-center">
        <div className="border-2 border-green-400 p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold tracking-wider mb-2 glitch">MUSESHIFT</h1>
          <p className="text-green-500 text-sm mb-6">personal energy × sonic intelligence</p>

          <p className="text-sm mb-6 text-green-300">
            Track your energy states throughout the day. Generate playlists to shift your state. See your patterns emerge.
          </p>

          <button
            onClick={connectSpotify}
            className="w-full border-2 border-green-400 p-4 hover:bg-green-400 hover:text-black transition-all flex items-center justify-center gap-3 text-lg"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            CONNECT SPOTIFY
          </button>
        </div>
      </div>
    );
  }

  // Main Interface
  return (
    <div className="min-h-screen bg-black text-green-400 p-4 flex flex-col">
      {/* Header */}
      <div className="border-2 border-green-400 p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-wider glitch">MUSESHIFT_PROTOCOL</h1>
            <p className="text-green-500 text-sm">personal energy × sonic intelligence</p>
          </div>
          <div className="text-right text-xs space-y-1">
            <div className="text-green-300">{spotifyUser?.display_name || spotifyUser?.id}</div>
            <div className={loading ? 'animate-pulse text-yellow-400' : 'text-green-400'}>
              {loading ? '● PROCESSING' : '○ READY'}
            </div>
            <Link
              href="/dashboard"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              view dashboard →
            </Link>
            <Link
              href="/nca"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              NCA toolkit →
            </Link>
          </div>
        </div>

        {/* Mini stats bar */}
        <div className="flex gap-4 text-xs mt-3 pt-3 border-t border-green-400/30">
          <span>today: {todayStats.states.length} states</span>
          <span>|</span>
          <span>{todayStats.playlists} playlists</span>
          {todayStats.states.length > 0 && (
            <>
              <span>|</span>
              <span className={STATE_COLORS[todayStats.states[todayStats.states.length - 1]]}>
                last: {todayStats.states[todayStats.states.length - 1]}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Terminal output */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2 text-sm max-h-[60vh] border border-green-400/20 p-4 bg-black/50">
        {messages.map((msg, i) => (
          <div key={i} className={`
            ${msg.type === 'system' ? 'text-green-400' : ''}
            ${msg.type === 'user' ? 'text-cyan-400 ml-4' : ''}
            ${msg.type === 'state' ? `${STATE_COLORS[msg.state] || 'text-green-400'} font-bold` : ''}
            ${msg.type === 'pathway' ? 'text-yellow-400 ml-6 border-l-2 border-yellow-400 pl-4 whitespace-pre-line' : ''}
            ${msg.type === 'playlist' ? 'text-green-300 whitespace-pre-wrap' : ''}
            ${msg.type === 'error' ? 'text-red-400' : ''}
          `}>
            {msg.type === 'user' && '> '}
            {msg.type === 'system' && '[ '}
            {msg.text}
            {msg.type === 'system' && ' ]'}
          </div>
        ))}

        {loading && (
          <div className="text-green-400 animate-pulse">
            [ PROCESSING... ]
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-2 border-green-400 p-3 mt-auto bg-black">
        <div className="flex items-center gap-2">
          <span className="text-green-400">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pathways ? "enter pathway number..." : "describe your state..."}
            className="flex-1 bg-transparent text-green-400 outline-none placeholder-green-700"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-1 border border-green-400 hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '...' : 'EXECUTE'}
          </button>
        </div>

        <div className="mt-2 flex gap-3 text-xs flex-wrap">
          <button type="button" onClick={() => setInput('help')} className="text-green-600 hover:text-green-400">
            help
          </button>
          <button type="button" onClick={() => setInput('stats')} className="text-green-600 hover:text-green-400">
            stats
          </button>
          <button type="button" onClick={() => setInput('clear')} className="text-green-600 hover:text-green-400">
            clear
          </button>
          <span className="text-green-800">|</span>
          <button type="button" onClick={() => setInput('scattered after session, chest tight')} className="text-green-700 hover:text-green-400">
            test: fraymark
          </button>
          <button type="button" onClick={() => setInput('calm, grounded, present')} className="text-green-700 hover:text-green-400">
            test: clearmark
          </button>
        </div>
      </form>
    </div>
  );
}
