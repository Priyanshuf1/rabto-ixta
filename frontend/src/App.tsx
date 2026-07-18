/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Image as ImageIcon, 
  Search, 
  Settings, 
  Sparkles, 
  Link2,
  Info
} from 'lucide-react';
import InstagramLookup from './components/InstagramLookup';
import PhotoCarousel from './components/PhotoCarousel';
import { CarouselImage, InstagramTarget } from './types';

const INITIAL_IMAGES: CarouselImage[] = [
  {
    id: 'photo-1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    caption: 'Target Stream Frame A',
  },
  {
    id: 'photo-2',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
    caption: 'Target Stream Frame B',
  },
  {
    id: 'photo-3',
    url: 'https://images.unsplash.com/photo-1618005198143-d3663a940287?auto=format&fit=crop&w=600&q=80',
    caption: 'Target Stream Frame C',
  },
  {
    id: 'photo-4',
    url: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=600&q=80',
    caption: 'Target Stream Frame D',
  }
];

export default function App() {
  const [target, setTarget] = useState<InstagramTarget>({
    username: 'christiano_demo',
    userId: '53912839420',
    status: 'STANDBY',
    followers: '52.4M',
    following: '412',
    postsCount: 154,
  });

  const [profilePhoto, setProfilePhoto] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  );

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [targetId, setTargetId] = useState<string>('');
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>(INITIAL_IMAGES);

  // Called when Phase 1 finishes: Username -> User ID
  const handleResolveId = (username: string, userId: string, userData?: any) => {
    setTarget((prev) => ({
      ...prev,
      username,
      userId,
      status: 'DISCOVERED',
      ...(userData && {
        followers: userData.followers >= 1000000 ? (userData.followers / 1000000).toFixed(1) + 'M' : userData.followers >= 1000 ? (userData.followers / 1000).toFixed(1) + 'K' : userData.followers?.toString(),
        following: userData.following?.toString(),
        postsCount: userData.postsCount,
      })
    }));

    if (userData?.profilePic) {
      setProfilePhoto(userData.profilePic);
    }
  };

  // Called when Phase 2 finishes: User ID -> Load follow/feed data
  const handleLoadTarget = async (username: string, idOrUsername: string) => {
    setTarget(prev => ({
      ...prev,
      username,
      userId: idOrUsername,
      status: 'DECRYPTING',
    }));

    try {
      // Use the saved key from localStorage if available
      const savedKey = localStorage.getItem('rabto_api_key') || '';
      const headers: Record<string, string> = {};
      if (savedKey) headers['x-api-key'] = savedKey;

      const response = await fetch(`/api/media/${idOrUsername}`, { headers });
      const data = await response.json();
      
      if (data.success) {
        if (data.userInfo) {
           setTarget(prev => ({
             ...prev,
             username: data.userInfo.username || prev.username,
             followers: data.userInfo.followers >= 1000000 ? (data.userInfo.followers / 1000000).toFixed(1) + 'M' : data.userInfo.followers >= 1000 ? (data.userInfo.followers / 1000).toFixed(1) + 'K' : data.userInfo.followers?.toString(),
             following: data.userInfo.following?.toString(),
             postsCount: data.userInfo.postsCount,
             status: 'DISCOVERED',
           }));
           if (data.userInfo.profilePic) {
             setProfilePhoto(data.userInfo.profilePic);
           }
        } else {
           setTarget(prev => ({ ...prev, status: 'DISCOVERED' }));
        }
        
        if (data.images && data.images.length > 0) {
          setCarouselImages(data.images);
        } else {
          setCarouselImages([{ id: 'error-1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80', caption: 'No images found' }]);
        }
      } else {
        // Show actual backend error if available
        const errorMsg = data.error || 'API Error: No data returned';
        setCarouselImages([{ id: 'error-1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80', caption: errorMsg }]);
      }
    } catch (error: any) {
      console.error("Failed to fetch media:", error);
      setCarouselImages([{ id: 'error-1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80', caption: error.message || 'Failed to connect to backend' }]);
    }
  };

  const handleAddCarouselImage = (url: string, caption: string) => {
    setCarouselImages((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        url,
        caption,
      },
    ]);
  };

  const handleRemoveCarouselImage = (id: string) => {
    setCarouselImages((prev) => prev.filter((img) => img.id !== id));
  };


  return (
    <div className="min-h-screen bg-[#070b12] text-green-400 font-mono relative overflow-hidden flex flex-col justify-between selection:bg-green-500 selection:text-black">
      
      {/* BACKGROUND GRAPHIC OR LINE */}
      <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-60" />

      {/* HEADER SECTION */}
      <header className="border-b border-green-500/20 bg-[#0a101d]/90 px-4 py-5 md:px-8 relative">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                <Search className="text-black w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                  rabto-ixta
                </h1>
                <div className="text-[10px] tracking-[0.2em] text-green-500/60 font-bold uppercase">
                  Data Extraction System
                </div>
              </div>
            </div>
            <p className="text-xs text-green-500/60 mt-3">
              Dual-API testing console for extracting numerical user IDs and rendering straight-line profile media streams. Designed & Engineered by <span className="text-green-400 font-bold underline decoration-green-400 decoration-2">Priyanshu Awasthi</span>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-[#05080f] border border-green-500/20 px-3 py-1.5 rounded text-[10px] text-green-500/80">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span>DEVELOPER: PRIYANSHU AWASTHI</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        
        {/* PHASE INTEGRATION GUIDE BANNER */}
        <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-4 text-xs space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-green-300">
            <Info size={14} className="text-green-400" />
            <span>DEVELOPMENT & API INTEGRATION WORKFLOW</span>
          </div>
          <p className="text-green-500/80">
            This workspace implements the complete frontend workflow for your two target APIs. First, resolve any Instagram username to fetch its unique numerical <span className="text-green-300 font-bold underline">User ID</span>. Then, insert that ID to query private follower structures, retrieve the custom profile photo, and initialize the continuous straight-line carousel below.
          </p>
        </div>

        {/* COMPONENT 1 & 2: LOOKUP AND TARGET STREAM LOADER */}
        <section className="space-y-6">
          <InstagramLookup
              onResolveId={(username, userId, data) => {
                setTargetId(userId);
                handleResolveId(username, userId, data);
              }}
              onLoadTarget={handleLoadTarget}
            />
        </section>

        {/* TARGET USER CARD & AVATAR ABOVE CAROUSEL */}
        <section className="bg-black/80 border border-green-500/30 rounded-lg p-6 glow-green relative">
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-green-500/40">
            <Sparkles size={11} />
            <span>RENDER CONSOLE v1.0</span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-green-500/20">
            
            {/* Target Profile Photo (retrieved by 2nd API) */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-green-500 p-1 bg-black overflow-hidden relative glow-green transition-transform group-hover:scale-105 duration-300">
                <img 
                  src={`/api/proxy-image?url=${encodeURIComponent(profilePhoto)}`} 
                  alt="API Profile Photo" 
                  className="w-full h-full object-cover rounded-full filter grayscale contrast-125"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
                  }}
                />
              </div>
              {/* Overlay crosshair lines */}
              <div className="absolute inset-0 border border-green-500/10 pointer-events-none rounded-full scale-110" />
            </div>

            {/* Profile Information Panel */}
            <div className="text-center md:text-left space-y-2">
              <span className="text-[10px] text-green-500/50 block font-bold tracking-widest">// TARGET IDENTIFICATION STREAM</span>
              
              <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                <h2 className="text-2xl font-black text-green-400 tracking-wider">
                  @{target.username}
                </h2>
                <span className="text-xs text-green-500/60 font-bold bg-[#0a101d] px-2 py-0.5 rounded border border-green-500/10">
                  ID: {target.userId}
                </span>
              </div>

              
              {/* Stats returned by your future API */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[11px] text-green-500/80 pt-1">
                <div>
                  <span className="text-green-500/40">FOLLOWERS:</span> <span className="text-green-400 font-bold">{target.followers}</span>
                </div>
                <div>
                  <span className="text-green-500/40">FOLLOWING:</span> <span className="text-green-400 font-bold">{target.following}</span>
                </div>
                <div>
                  <span className="text-green-500/40">POST NODES:</span> <span className="text-green-400 font-bold">{target.postsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* STREAM PHOTOS CONTAINER (The Infinite Straight-Line moving Carousel) */}
          <div className="mt-6">
            <span className="text-[11px] text-green-500/60 block mb-3 font-bold tracking-widest">
              [ CONTINUOUS USER POST MEDIA STREAM ]
            </span>
            <PhotoCarousel 
              images={carouselImages}
              onAddImage={handleAddCarouselImage}
              onRemoveImage={handleRemoveCarouselImage}
              targetUsername={target.username}
            />
          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-green-500/20 py-8 bg-black text-center text-green-500/50 text-[11px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-950/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 space-y-2 relative z-10">
          <p className="tracking-wider text-green-400 font-bold">
            ⚡ SYSTEM STAGING CONSOLE DEVELOPED BY <span className="text-white bg-green-950/80 border border-green-500/40 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(34,197,94,0.3)]">PRIYANSHU AWASTHI</span>
          </p>
          <p className="text-green-500/30 text-[10px]">© 2026 STAGING WORKSPACE. Ready to accept custom APIs. Change dummy parameters in the Add Image payload to test specific CDN assets.</p>
        </div>
      </footer>

    </div>
  );
}
