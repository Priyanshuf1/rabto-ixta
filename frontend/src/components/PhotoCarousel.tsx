/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, ArrowLeftRight, FastForward, Plus, Trash2, Eye, ExternalLink } from 'lucide-react';
import { CarouselImage } from '../types';

interface PhotoCarouselProps {
  images: CarouselImage[];
  onAddImage: (url: string, caption: string) => void;
  onRemoveImage: (id: string) => void;
  targetUsername: string;
}

export default function PhotoCarousel({
  images,
  onAddImage,
  onRemoveImage,
  targetUsername,
}: PhotoCarouselProps) {
  const [speed, setSpeed] = useState<number>(20); // seconds per loop
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newCaption, setNewCaption] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<CarouselImage | null>(null);

  // Quick preset speeds
  const speedPresets = [
    { label: 'SLOW', val: 35 },
    { label: 'MEDIUM', val: 20 },
    { label: 'FAST', val: 10 },
    { label: 'OVERDRIVE', val: 5 },
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    onAddImage(
      newUrl.trim(),
      newCaption.trim() || `Insta Recon Frame ${images.length + 1}`
    );
    setNewUrl('');
    setNewCaption('');
  };

  // Duplicate the list of images to achieve seamless looping scroll
  const duplicatedImages = [...images, ...images, ...images];

  return (
    <div className="border border-green-500/30 bg-black/80 rounded-lg overflow-hidden glow-green relative p-6 font-mono">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-green-500/20 pb-4 mb-6">
        <div>
          <span className="text-xs text-green-500/60 block">// INSTAGRAM STREAM CAROUSEL</span>
          <h2 className="text-lg font-bold text-green-400 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            TARGET PROFILE: @{targetUsername || 'anonymous_target'}
          </h2>
        </div>
        
        {/* Carousel controls */}
        <div className="flex flex-wrap gap-2 mt-3 md:mt-0 items-center text-xs">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 border rounded flex items-center gap-1 transition-all ${
              isPaused 
                ? 'bg-amber-950/40 border-amber-500 text-amber-400' 
                : 'bg-green-950/40 border-green-500 text-green-400 hover:bg-green-900/30'
            }`}
            title="Toggle Scrolling Animation"
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'RESUME MOTION' : 'PAUSE MOTION'}
          </button>

          <button
            onClick={() => setDirection(direction === 'left' ? 'right' : 'left')}
            className="px-3 py-1.5 bg-green-950/20 border border-green-500/30 text-green-400 rounded hover:bg-green-900/30 transition-all flex items-center gap-1"
            title="Change Scrolling Direction"
          >
            <ArrowLeftRight size={12} />
            DIR: {direction.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Speed Selector panel */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span className="text-green-500/60">SCROLL VELOCITY:</span>
        <div className="flex gap-1.5">
          {speedPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setSpeed(preset.val)}
              className={`px-2 py-0.5 border rounded transition-all text-[10px] ${
                speed === preset.val
                  ? 'bg-green-500 text-black font-bold border-green-500'
                  : 'border-green-500/30 text-green-500/80 hover:bg-green-950/30'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Infinite Scrolling Area */}
      <div className="relative w-full overflow-hidden bg-zinc-950/90 rounded border border-green-500/20 py-8 mb-6 cursor-pointer">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-5" />
        
        {images.length === 0 ? (
          <div className="text-center py-8 text-green-500/50 text-sm">
            [ NO PHOTOS LOADED IN STREAM ]
            <p className="text-[11px] mt-1 text-green-500/30">Use the injector panel below to load test images</p>
          </div>
        ) : (
          <div className="relative w-full flex">
            <motion.div
              className="flex gap-4 px-2 select-none"
              animate={{
                x: direction === 'left' ? [0, -33.33 + '%'] : [-33.33 + '%', 0]
              }}
              transition={{
                ease: 'linear',
                duration: speed,
                repeat: Infinity,
                repeatType: 'loop',
              }}
              // Simple check to pause framer motion
              style={{
                display: 'flex',
                pointerEvents: 'auto',
              }}
              key={`${direction}-${speed}-${isPaused}`} // re-mount on control changes for seamless updates
            >
              {/* If paused, we can stop animating, but Framer Motion handles it neatly on standard animate triggers */}
              {duplicatedImages.map((img, idx) => (
                <div
                  key={`${img.id}-${idx}`}
                  className="relative group flex-shrink-0 w-44 h-44 border border-green-500/30 bg-black rounded overflow-hidden hover:border-green-400 transition-all"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(img.url)}`}
                    alt={img.caption}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                    <p className="text-[10px] text-green-400 font-bold truncate">{img.caption}</p>
                    <span className="text-[8px] text-green-500/60 mt-0.5">CLICK TO RECON</span>
                  </div>
                  {/* Retro Target Finder lines */}
                  <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-green-500 opacity-60 pointer-events-none" />
                  <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-green-500 opacity-60 pointer-events-none" />
                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-green-500 opacity-60 pointer-events-none" />
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-green-500 opacity-60 pointer-events-none" />
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Hover overlay hint */}
        <div className="absolute bottom-1.5 right-3 text-[9px] text-green-500/40 pointer-events-none">
          ⚡ SEAMLESS ROTATING TRACK BUFFER
        </div>
      </div>



      {/* Fullscreen Recon Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-green-500 bg-black max-w-lg w-full rounded-lg overflow-hidden glow-green-strong font-mono">
            <div className="flex items-center justify-between bg-green-950/50 border-b border-green-500/40 px-4 py-2 text-xs">
              <span className="text-green-400 font-bold tracking-wider">▲ DECRYPTED MEDIA NODE RECON</span>
              <button 
                onClick={() => setSelectedImage(null)}
                className="text-green-500 hover:text-green-400 font-bold px-1"
              >
                [X] CLOSE
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <div className="relative w-full aspect-square border border-green-500/20 rounded overflow-hidden bg-zinc-950">
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(selectedImage.url)}`}
                  alt={selectedImage.caption}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="w-full mt-4 bg-zinc-900/60 border border-green-500/20 p-3 rounded text-xs space-y-1.5 text-green-400">
                <div><span className="text-green-500/50">FILE SPEC:</span> {selectedImage.id}.jpg</div>
                <div><span className="text-green-500/50">META CAPTION:</span> "{selectedImage.caption}"</div>
                <div><span className="text-green-500/50">HOST:</span> instagr.am/p/recon_token_9x72</div>
                <div className="pt-2 flex justify-between">
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-green-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> OPEN ORIGINAL SOURCE
                  </a>
                  <span className="text-[10px] text-green-500/50">HASH: SHA-256_F67D2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
