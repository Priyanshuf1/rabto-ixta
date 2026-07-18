/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Loader2, Copy, Check, Terminal, ArrowRight, Shield, Globe } from 'lucide-react';

interface InstagramLookupProps {
  apiKey: string;
  onResolveId: (username: string, userId: string, userData?: any) => void;
  onLoadTarget: (username: string, idOrUsername: string) => void;
  onAddLog?: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function InstagramLookup({
  apiKey,
  onResolveId,
  onLoadTarget,
  onAddLog,
}: InstagramLookupProps) {
  // Section 1: Username to ID Generator
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolvedId, setResolvedId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [resolveProgress, setResolveProgress] = useState<number>(0);
  const [resolveStepText, setResolveStepText] = useState<string>('');
  const [resolveError, setResolveError] = useState<string>('');

  // Section 2: ID or Username target loader
  const [targetQuery, setTargetQuery] = useState<string>('');
  const [isTargetLoading, setIsTargetLoading] = useState<boolean>(false);

  // Deterministic ID generator based on username (for realistic simulation)
  const generateDeterministicId = (uname: string): string => {
    let hash = 0;
    for (let i = 0; i < uname.length; i++) {
      hash = uname.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Return a realistic 10-12 digit Instagram User ID
    const positiveHash = Math.abs(hash);
    return `53${(positiveHash % 9000000000 + 1000000000)}`;
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const targetUser = usernameInput.trim().replace(/^@/, '').toLowerCase();
    setIsResolving(true);
    setResolvedId('');
    setResolveError('');
    setResolveProgress(0);
    onAddLog?.(`Initializing ID extraction protocol for target: @${targetUser}`, 'system');

    const steps = [
      { text: 'Spinning up residential proxy networks...', duration: 250, progress: 20 },
      { text: 'Injecting GraphQL edge query headers...', duration: 300, progress: 50 },
      { text: 'Bypassing Instagram rate limits...', duration: 400, progress: 80 },
      { text: 'Querying external API...', duration: 200, progress: 90 },
    ];

    for (const step of steps) {
      setResolveStepText(step.text);
      onAddLog?.(step.text, 'info');
      await new Promise((resolve) => setTimeout(resolve, step.duration));
      setResolveProgress(step.progress);
    }

    try {
      // Call our local backend API
      const response = await fetch(`/api/lookup?username=${encodeURIComponent(targetUser)}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      });
      
      const data = await response.json();

      if (response.ok && data.success && data.userId) {
        setResolveProgress(100);
        setResolvedId(data.userId);
        setIsResolving(false);
        onAddLog?.(`Extraction successful. @${targetUser} mapped to numerical ID: ${data.userId}`, 'success');
        onResolveId(targetUser, data.userId, data);
        
        // Auto-populate the Target Loader input
        setTargetQuery(data.userId);
      } else {
        const errorMsg = data.error || 'User not found or API failed';
        onAddLog?.(`Extraction failed: ${errorMsg}`, 'error');
        setResolveStepText(`Extraction Halted.`);
        setResolveError(errorMsg);
        setIsResolving(false);
      }
    } catch (error) {
      onAddLog?.(`Extraction failed: ${error}`, 'error');
      setResolveStepText('Failed to query API');
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
    onAddLog?.(`Preparing sandbox container for target profile resource: "${query}"`, 'system');
    
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Check if the input is numeric (likely an ID) or string (username)
    const isId = /^\d+$/.test(query);
    let finalUsername = isId ? `target_${query.slice(-4)}` : query.replace(/^@/, '');
    
    onAddLog?.(`Successfully synchronized with target. Initializing stream carousel...`, 'success');
    onLoadTarget(finalUsername, query);
    setIsTargetLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
      
      {/* CARD 1: USERNAME TO ID CONVERTER */}
      <div className="border border-green-500/30 bg-black/80 p-5 rounded-lg overflow-hidden glow-green relative">
        <div className="absolute top-2 right-2 text-[9px] text-green-500/30">
          MODULE // 01: METADATA_EXTRACTOR
        </div>
        
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
            <button
              type="submit"
              disabled={isResolving || !usernameInput.trim()}
              className="absolute right-2 top-2 p-1 text-green-500 hover:text-green-400 disabled:opacity-30 disabled:hover:text-green-500"
            >
              <Search size={16} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isResolving || !usernameInput.trim()}
            className="w-full bg-green-950/40 hover:bg-green-900/40 border border-green-500 text-green-400 font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          >
            {isResolving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                EXTRACTING KEY DATA...
              </>
            ) : (
              <>
                <Globe size={14} />
                RESOLVE INSTA HANDLE
              </>
            )}
          </button>
        </form>

        {/* Resolve Progress Bar */}
        {isResolving && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[10px] text-green-500/70">
              <span className="truncate max-w-[80%]">⚡ {resolveStepText}</span>
              <span>{resolveProgress}%</span>
            </div>
            <div className="w-full bg-zinc-950 border border-green-500/20 h-2.5 rounded overflow-hidden p-[1px]">
              <div
                className="bg-green-500 h-full transition-all duration-300 rounded-sm"
                style={{ width: `${resolveProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {resolveError && (
          <div className="mt-4 border border-red-500/50 bg-red-950/20 rounded p-3 text-red-400 text-xs font-bold leading-relaxed shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <span className="block text-[10px] text-red-500/70 mb-1">// API ERROR DETECTED</span>
            {resolveError}
          </div>
        )}

        {/* Resolved ID Result */}
        {resolvedId && (
          <div className="mt-4 border border-green-500/30 bg-zinc-950/90 rounded p-3 space-y-2">
            <span className="text-[10px] text-green-500/60 block">// RESOLVED ACCOUNT PAYLOAD:</span>
            <div className="flex items-center justify-between bg-black/60 border border-green-500/20 px-3 py-2 rounded">
              <div>
                <span className="text-green-500/40 text-[10px] block font-bold">pk_id / numeric_id</span>
                <span className="text-green-400 text-sm font-bold tracking-widest">{resolvedId}</span>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 text-green-400 hover:text-green-300 bg-green-950/30 hover:bg-green-900/30 border border-green-500/30 rounded transition-all"
                title="Copy to Clipboard"
              >
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

      {/* CARD 2: PHOTO STREAM LOADING PORT */}
      <div className="border border-green-500/30 bg-black/80 p-5 rounded-lg overflow-hidden glow-green relative">
        <div className="absolute top-2 right-2 text-[9px] text-green-500/30">
          MODULE // 02: STREAM_PORT
        </div>

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
              <>
                <Loader2 size={14} className="animate-spin text-black" />
                SYNCHRONIZING FEED...
              </>
            ) : (
              <>
                <span>SYNCHRONIZE STREAM MODULE</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Quick presets for testing */}
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
                onClick={() => {
                  setTargetQuery(preset.query);
                  onAddLog(`Preloaded preset config selected: "${preset.label}"`, 'info');
                }}
                className="bg-green-950/20 hover:bg-green-950/50 border border-green-500/20 text-green-500 rounded px-2.5 py-1 text-[10px] transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
