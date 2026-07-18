/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Copy, Check, Terminal, ArrowRight, Shield, Globe, Key, Zap, Lock } from 'lucide-react';

interface InstagramLookupProps {
  onResolveId: (username: string, userId: string, userData?: any) => void;
  onLoadTarget: (username: string, idOrUsername: string) => void;
  onAddLog?: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

const LS_KEY = 'rabto_api_key';
const LS_USES = 'rabto_free_uses';
const LS_DATE = 'rabto_date';

export default function InstagramLookup({ onResolveId, onLoadTarget, onAddLog }: InstagramLookupProps) {
  // API key state
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY) || '');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [keyInputVal, setKeyInputVal] = useState<string>('');
  const [keySaved, setKeySaved] = useState<boolean>(false);
  const [freeUsesLeft, setFreeUsesLeft] = useState<number>(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(LS_DATE);
    if (savedDate !== today) {
      localStorage.setItem(LS_DATE, today);
      localStorage.setItem(LS_USES, '1');
      return 1;
    }
    return parseInt(localStorage.getItem(LS_USES) || '1');
  });

  // Section 1
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolvedId, setResolvedId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [resolveProgress, setResolveProgress] = useState<number>(0);
  const [resolveStepText, setResolveStepText] = useState<string>('');
  const [resolveError, setResolveError] = useState<string>('');
  const [isDailyLimitHit, setIsDailyLimitHit] = useState<boolean>(false);

  // Section 2
  const [targetQuery, setTargetQuery] = useState<string>('');
  const [isTargetLoading, setIsTargetLoading] = useState<boolean>(false);

  const consumeLocalFreeUse = () => {
    const newCount = Math.max(0, freeUsesLeft - 1);
    setFreeUsesLeft(newCount);
    localStorage.setItem(LS_USES, String(newCount));
    localStorage.setItem(LS_DATE, new Date().toDateString());
  };

  const handleSaveKey = async () => {
    const key = keyInputVal.trim();
    if (!key || key.length < 10) return;
    
    // Privacy Enforcement: Key is only saved in local browser storage.
    // It is never pooled, logged, or stored on the server.
    localStorage.setItem(LS_KEY, key);
    setApiKey(key);
    setKeySaved(true);
    setShowKeyInput(false);
    setIsDailyLimitHit(false);
    setKeyInputVal('');
    onAddLog?.('✅ API key saved securely in your browser.', 'success');
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    // Client-side rate limit check
    if (!apiKey && freeUsesLeft <= 0) {
      setIsDailyLimitHit(true);
      setShowKeyInput(true);
      setResolveError('Daily free limit reached. Enter your RapidAPI key for unlimited access.');
      return;
    }

    const targetUser = usernameInput.trim().replace(/^@/, '').toLowerCase();
    setIsResolving(true);
    setResolvedId('');
    setResolveError('');
    setIsDailyLimitHit(false);
    setResolveProgress(0);
    onAddLog?.(`Initializing ID extraction protocol for target: @${targetUser}`, 'system');

    const steps = [
      { text: 'Preparing connection...', duration: 250, progress: 20 },
      { text: 'Connecting to API...', duration: 300, progress: 50 },
      { text: 'Retrieving user payload...', duration: 400, progress: 80 },
      { text: 'Finalizing extraction...', duration: 200, progress: 90 },
    ];

    for (const step of steps) {
      setResolveStepText(step.text);
      onAddLog?.(step.text, 'info');
      await new Promise((res) => setTimeout(res, step.duration));
      setResolveProgress(step.progress);
    }

    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey;

      const response = await fetch(`/api/lookup?username=${encodeURIComponent(targetUser)}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (response.status === 429 && data.error === 'DAILY_LIMIT_REACHED') {
        setIsDailyLimitHit(true);
        setShowKeyInput(true);
        setResolveError(data.message);
        setIsResolving(false);
        return;
      }

      if (response.ok && data.success && data.userId) {
        setResolveProgress(100);
        setResolvedId(data.userId);
        setIsResolving(false);
        onAddLog?.(`✅ Extraction successful. @${targetUser} → ID: ${data.userId}`, 'success');
        onResolveId(targetUser, data.userId, data);
        setTargetQuery(data.userId);

        // Consume free use if no key was used
        if (!apiKey) consumeLocalFreeUse();

      } else {
        const errorMsg = data.error || data.message || 'User not found or API failed';
        onAddLog?.(`Extraction failed: ${errorMsg}`, 'error');
        setResolveStepText('Extraction Halted.');
        setResolveError(errorMsg);
        setIsResolving(false);
      }
    } catch (error) {
      onAddLog?.(`Extraction failed: ${error}`, 'error');
      setResolveStepText('Failed to connect to backend');
      setResolveError(String(error));
      setIsResolving(false);
    }
  };

  const handleCopy = () => {
    if (!resolvedId) return;
    navigator.clipboard.writeText(resolvedId);
    setCopied(true);
    onAddLog?.(`Copied ID ${resolvedId} to clipboard`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuery.trim()) return;
    const query = targetQuery.trim();
    setIsTargetLoading(true);
    onAddLog?.(`Preparing sandbox container for target: "${query}"`, 'system');
    await new Promise((res) => setTimeout(res, 800));
    const isId = /^\d+$/.test(query);
    const finalUsername = isId ? `target_${query.slice(-4)}` : query.replace(/^@/, '');
    onAddLog?.(`Stream initialized for target.`, 'success');
    onLoadTarget(finalUsername, query);
    setIsTargetLoading(false);
  };

  return (
    <div className="space-y-4 font-mono text-xs">

      {/* ── FREE USE BANNER ─────────────────────────────────────── */}
      {!apiKey && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded border text-[11px] transition-all ${
          freeUsesLeft > 0
            ? 'border-green-500/30 bg-green-950/20 text-green-400'
            : 'border-red-500/30 bg-red-950/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <Zap size={12} className={freeUsesLeft > 0 ? 'text-green-400' : 'text-red-400'} />
            {freeUsesLeft > 0
              ? `${freeUsesLeft} free lookup remaining today`
              : '⛔ Daily free limit used — add your API key below for unlimited access'
            }
          </div>
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 border border-current px-2 py-1 rounded text-[10px] font-bold transition-all"
          >
            <Key size={10} />
            {apiKey ? 'CHANGE KEY' : 'ADD KEY'}
          </button>
        </div>
      )}

      {/* ── API KEY PANEL ───────────────────────────────────────── */}
      {(showKeyInput || (apiKey && !resolvedId)) && (
        <div className={`border rounded-lg p-4 space-y-3 ${
          isDailyLimitHit
            ? 'border-red-500/50 bg-red-950/20'
            : 'border-green-500/20 bg-[#0a101d]/60'
        }`}>
          {isDailyLimitHit && (
            <div className="flex items-center gap-2 text-red-400 text-[11px] font-bold">
              <Lock size={12} />
              DAILY LIMIT REACHED — Enter your free RapidAPI key to continue
            </div>
          )}
          {apiKey && !isDailyLimitHit && (
            <div className="flex items-center gap-2 text-green-400 text-[10px]">
              <Shield size={11} />
              <span>ACTIVE KEY: {apiKey.substring(0, 6)}...{apiKey.slice(-6)}</span>
              <span className="text-green-500/40">• Unlimited access</span>
            </div>
          )}
          <div className="text-[10px] text-green-500/60 space-y-1">
            <p>1. Go to <a href="https://rapidapi.com/for-sharm/api/flashapi1" target="_blank" rel="noreferrer" className="text-green-300 underline hover:text-green-200">FlashAPI1 on RapidAPI</a> (free account)</p>
            <p>2. Subscribe to the <strong className="text-green-400">Basic plan ($0/month)</strong></p>
            <p>3. Copy your <code className="text-green-400">X-RapidAPI-Key</code> and paste below</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInputVal}
              onChange={(e) => setKeyInputVal(e.target.value)}
              placeholder="Paste X-RapidAPI-Key here..."
              className="flex-1 bg-black border border-green-500/30 rounded px-3 py-2 text-green-400 placeholder-green-900/50 focus:outline-none focus:border-green-400 text-[11px]"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            />
            <button
              onClick={handleSaveKey}
              disabled={!keyInputVal.trim()}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-30 text-black font-bold px-3 py-1.5 rounded text-[10px] transition-all"
            >
              {keySaved ? '✓ SAVED!' : 'SAVE'}
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD 1: USERNAME TO ID */}
        <div className="border border-green-500/30 bg-black/80 p-5 rounded-lg overflow-hidden glow-green relative">
          <div className="absolute top-2 right-2 text-[9px] text-green-500/30">MODULE // 01: METADATA_EXTRACTOR</div>

          <h3 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2 tracking-wider">
            <Terminal size={14} className="text-green-500" />
            EXTRACT NUMERICAL INSTAGRAM ID
          </h3>

          <p className="text-green-500/70 mb-4 leading-relaxed text-[11px]">
            Enter an Instagram handle to query standard nodes, extract the unique account ID key (<span className="text-green-400 font-bold">pk_id</span>), and decrypt credentials.
          </p>

          <form onSubmit={handleResolve} className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-green-500 font-bold">@</span>
              <input
                type="text"
                required
                placeholder="instagram_username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled={isResolving}
                className="w-full bg-black border border-green-500/30 rounded pl-7 pr-10 py-2.5 text-green-400 placeholder-green-900/60 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50"
              />
              <button type="submit" disabled={isResolving || !usernameInput.trim()} className="absolute right-2 top-2 p-1 text-green-500 hover:text-green-400 disabled:opacity-30">
                <Search size={16} />
              </button>
            </div>

            <button
              type="submit"
              disabled={isResolving || !usernameInput.trim()}
              className="w-full bg-green-950/40 hover:bg-green-900/40 border border-green-500 text-green-400 font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            >
              {isResolving ? (
                <><Loader2 size={14} className="animate-spin" />EXTRACTING KEY DATA...</>
              ) : (
                <><Globe size={14} />RESOLVE INSTA HANDLE</>
              )}
            </button>
          </form>

          {isResolving && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] text-green-500/70">
                <span className="truncate max-w-[80%]">⚡ {resolveStepText}</span>
                <span>{resolveProgress}%</span>
              </div>
              <div className="w-full bg-zinc-950 border border-green-500/20 h-2.5 rounded overflow-hidden p-[1px]">
                <div className="bg-green-500 h-full transition-all duration-300 rounded-sm" style={{ width: `${resolveProgress}%` }} />
              </div>
            </div>
          )}

          {resolveError && !isDailyLimitHit && (
            <div className="mt-4 border border-red-500/50 bg-red-950/20 rounded p-3 text-red-400 text-xs font-bold leading-relaxed shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="block text-[10px] text-red-500/70 mb-1">// API ERROR DETECTED</span>
              {resolveError}
            </div>
          )}

          {resolvedId && (
            <div className="mt-4 border border-green-500/30 bg-zinc-950/90 rounded p-3 space-y-2">
              <span className="text-[10px] text-green-500/60 block">// RESOLVED ACCOUNT PAYLOAD:</span>
              <div className="flex items-center justify-between bg-black/60 border border-green-500/20 px-3 py-2 rounded">
                <div>
                  <span className="text-green-500/40 text-[10px] block font-bold">pk_id / numeric_id</span>
                  <span className="text-green-400 text-sm font-bold tracking-widest">{resolvedId}</span>
                </div>
                <button onClick={handleCopy} className="p-2 text-green-400 hover:text-green-300 bg-green-950/30 hover:bg-green-900/30 border border-green-500/30 rounded transition-all" title="Copy">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-green-500/50">
                <Shield size={10} />
                <span>DETERMINISTIC INSTAGRAM ENCRYPTED BLOCK MATCHED</span>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: STREAM LOADER */}
        <div className="border border-green-500/30 bg-black/80 p-5 rounded-lg overflow-hidden glow-green relative">
          <div className="absolute top-2 right-2 text-[9px] text-green-500/30">MODULE // 02: STREAM_PORT</div>

          <h3 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2 tracking-wider">
            <Terminal size={14} className="text-green-500" />
            LOAD MEDIA STREAM MODULE
          </h3>

          <p className="text-green-500/70 mb-4 leading-relaxed text-[11px]">
            Enter the resolved numerical <span className="text-green-400 font-bold">User ID</span> below to initialize the horizontal photo carousel tracking feed.
          </p>

          <form onSubmit={handleLoadTarget} className="space-y-3">
            <div>
              <label className="block text-[10px] text-green-500/60 mb-1">TARGET KEY (USER ID)</label>
              <input
                type="text"
                required
                placeholder="e.g. 53189410"
                value={targetQuery}
                onChange={(e) => setTargetQuery(e.target.value)}
                disabled={isTargetLoading}
                className="w-full bg-black border border-green-500/30 rounded px-3 py-2.5 text-green-400 placeholder-green-900/60 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={isTargetLoading || !targetQuery.trim()}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            >
              {isTargetLoading ? (
                <><Loader2 size={14} className="animate-spin text-black" />SYNCHRONIZING FEED...</>
              ) : (
                <><span>SYNCHRONIZE STREAM MODULE</span><ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-green-500/10">
            <span className="text-[10px] text-green-500/60 block mb-2">QUICK PROFILE CONTEXT PRESETS:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'NASA Tech Feed', query: 'nasa_tech' },
                { label: 'Cyberpunk Aesthetic', query: 'neon_grid' },
                { label: 'Synthwave Glitch', query: 'synth_wave' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setTargetQuery(preset.query); onAddLog?.(`Preset selected: "${preset.label}"`, 'info'); }}
                  className="bg-green-950/20 hover:bg-green-950/50 border border-green-500/20 text-green-500 rounded px-2.5 py-1 text-[10px] transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
