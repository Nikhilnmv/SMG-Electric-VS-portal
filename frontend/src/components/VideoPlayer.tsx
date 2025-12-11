'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Hls from 'hls.js';
import { analytics } from '@/lib/analytics';

interface VideoPlayerProps {
  src: string;
  videoId?: string; // Optional - for video pages
  lessonId?: string; // Optional - for lesson pages
  title?: string; // Optional - for lesson pages
  autoplay?: boolean;
  onProgressUpdate?: (secondsWatched: number) => void;
  onVideoEnd?: () => void;
  // Lesson-specific callbacks
  onProgress?: (secondsWatched: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  initialTime?: number;
  onFocusStart?: () => void;
  onFocusEnd?: () => void;
  isFocusMode?: boolean;
}

export default function VideoPlayer({
  src,
  videoId,
  lessonId,
  title,
  autoplay = true,
  onProgressUpdate,
  onVideoEnd,
  onProgress,
  onPlay: onPlayCallback,
  onPause: onPauseCallback,
  onComplete: onCompleteCallback,
  initialTime = 0,
  onFocusStart,
  onFocusEnd,
  isFocusMode = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressEventRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(isFocusMode);
  const [playerReady, setPlayerReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentQuality, setCurrentQuality] = useState<string>('');
  const progressIntervalRef2 = useRef<NodeJS.Timeout | null>(null);
  const lastProgressSentRef = useRef<number>(0);
  const hasOpenedRef = useRef(false);
  const hasExitedRef = useRef(false);
  const qualityButtonRef = useRef<any>(null);

  // Track VIDEO_OPENED when component mounts and video is ready
  useEffect(() => {
    if (isReady && !hasOpenedRef.current && (videoId || lessonId)) {
      hasOpenedRef.current = true;
      const player = playerRef.current;
      if (player) {
        const duration = player.duration() || 0;
        setVideoDuration(duration);
        const eventData: any = {
          eventType: 'VIDEO_OPENED',
          currentTime: 0,
          duration,
        };
        if (videoId) eventData.videoId = videoId;
        if (lessonId) eventData.lessonId = lessonId;
        analytics.track(eventData);
      }
    }
  }, [isReady, videoId, lessonId]);

  // Track VIDEO_EXITED when component unmounts
  useEffect(() => {
    return () => {
      if (hasOpenedRef.current && !hasExitedRef.current && (videoId || lessonId)) {
        hasExitedRef.current = true;
        const player = playerRef.current;
        if (player) {
        const exitEventData: any = {
          eventType: 'VIDEO_EXITED',
          currentTime: Math.floor(player.currentTime() || 0),
          duration: videoDuration,
        };
        if (videoId) exitEventData.videoId = videoId;
        if (lessonId) exitEventData.lessonId = lessonId;
        analytics.track(exitEventData);
        }
      }
    };
  }, [videoId, lessonId, videoDuration]);

  // Initialize player once - ensure element is in DOM
  useEffect(() => {
    // Use a small delay to ensure the element is in the DOM
    const initTimer = setTimeout(() => {
      if (!videoRef.current) {
        console.warn('[VideoPlayer] Video ref not available');
        return;
      }

      // Check if element is actually in the DOM
      if (!videoRef.current.isConnected) {
        console.warn('[VideoPlayer] Video element not in DOM yet');
        return;
      }

      // Only initialize if player doesn't exist
      if (!playerRef.current) {
        console.log('[VideoPlayer] Initializing player...');

        // Ensure parent container has dimensions
        const container = videoRef.current.parentElement;
        if (container) {
          const containerWidth = container.offsetWidth || container.clientWidth;
          if (containerWidth === 0) {
            console.warn('[VideoPlayer] Container has zero width, waiting...');
            return;
          }
        }

        // Initialize Video.js player
        // Disable native HLS since we're using HLS.js manually
        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: false, // We'll handle autoplay after HLS loads
          preload: 'auto',
          fluid: true, // Enable fluid mode for responsive sizing
          responsive: true,
          aspectRatio: '16:9',
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          html5: {
            hls: {
              withCredentials: false,
            },
            nativeVideoTracks: false,
            nativeAudioTracks: false,
            nativeTextTracks: false,
          },
        });

        // Ensure player is properly sized when ready
        player.ready(() => {
          console.log('[VideoPlayer] Player ready, ensuring proper dimensions');
          setPlayerReady(true); // Mark player as ready
          
          // Force dimensions on the player element
          const playerEl = player.el();
          if (playerEl && playerEl.parentElement) {
            // With fluid mode, we just need to ensure the container has width
            const parentWidth = playerEl.parentElement.offsetWidth || playerEl.parentElement.clientWidth;
            if (parentWidth > 0) {
              // Trigger resize to recalculate dimensions
              player.trigger('resize');
              
              // Use a small delay to let Video.js calculate dimensions
              setTimeout(() => {
                player.trigger('resize');
              }, 100);
            }
          }
          
          // Ensure video element is visible
          const videoEl = playerEl?.querySelector('video');
          if (videoEl) {
            videoEl.style.display = 'block';
            videoEl.style.visibility = 'visible';
            
            console.log('[VideoPlayer] Video element dimensions:', {
              width: videoEl.offsetWidth,
              height: videoEl.offsetHeight,
              clientWidth: videoEl.clientWidth,
              clientHeight: videoEl.clientHeight,
              display: window.getComputedStyle(videoEl).display,
              parentWidth: playerEl?.parentElement?.offsetWidth
            });
          }
        });

        playerRef.current = player;
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      // Cleanup quality button
      if (qualityButtonRef.current && playerRef.current) {
        const player = playerRef.current as any;
        if (player.controlBar) {
          try {
            player.controlBar.removeChild(qualityButtonRef.current);
          } catch (e) {
            console.warn('[VideoPlayer] Could not remove quality button on unmount:', e);
          }
        }
        qualityButtonRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Handle src changes and player readiness
  useEffect(() => {
    if (!src) {
      console.log('[VideoPlayer] No source URL provided');
      return;
    }

    if (!playerRef.current || !playerReady) {
      console.log('[VideoPlayer] Waiting for player to initialize...', { hasSrc: !!src, hasPlayer: !!playerRef.current, playerReady });
      return;
    }

    if (!videoRef.current) {
      console.log('[VideoPlayer] Waiting for video element...', { hasSrc: !!src, hasPlayer: !!playerRef.current });
      return;
    }

    console.log('[VideoPlayer] Loading HLS source:', src);

    // Check if HLS is natively supported
    if (Hls.isSupported()) {
      // Destroy existing HLS instance if it exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        capLevelToPlayerSize: true,
        debug: false,
        xhrSetup: (xhr, url) => {
          // Ensure CORS is handled properly
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;
      
      // Get the video element from Video.js player
      const videoElement = playerRef.current?.el().querySelector('video') || videoRef.current;
      
      if (!videoElement) {
        console.error('[VideoPlayer] No video element found');
        return;
      }
      
      // Clear any existing source
      if (videoElement.src) {
        videoElement.src = '';
        videoElement.removeAttribute('src');
      }
      
      console.log('[VideoPlayer] Loading HLS source and attaching to video element');
      console.log('[VideoPlayer] Video element state:', {
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        paused: videoElement.paused,
        currentSrc: videoElement.currentSrc
      });
      
      hls.loadSource(src);
      hls.attachMedia(videoElement);
      
      // Wait for video element to be ready
      if (videoElement.readyState === 0) {
        videoElement.addEventListener('loadedmetadata', () => {
          console.log('[VideoPlayer] Video metadata loaded, readyState:', videoElement.readyState);
        }, { once: true });
      }

      // Log when source is loaded
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log('[VideoPlayer] HLS manifest loading...');
      });

      // Handle quality levels
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] HLS manifest parsed, levels:', hls.levels?.length || 0);
        const levels = hls.levels;
        if (levels && levels.length > 0) {
          // Enable adaptive bitrate
          hls.startLevel = -1; // Auto

          // Add quality selector menu to Video.js player
          const qualityLevels = levels.map((level, index) => ({
            index,
            label: `${level.height}p`,
            value: index,
          }));

          // Add "Auto" option
          qualityLevels.unshift({
            index: -1,
            label: 'Auto',
            value: -1,
          });

          // Remove existing quality button if it exists
          if (qualityButtonRef.current && playerRef.current) {
            const player = playerRef.current as any;
            if (player.controlBar) {
              try {
                player.controlBar.removeChild(qualityButtonRef.current);
              } catch (e) {
                console.warn('[VideoPlayer] Could not remove existing quality button:', e);
              }
            }
            qualityButtonRef.current = null;
          }

          // Create quality menu button
          const MenuButton = videojs.getComponent('MenuButton') as any;
          const MenuItem = videojs.getComponent('MenuItem') as any;

          class QualityMenuButton extends MenuButton {
            private menuItems: any[] = [];

            constructor(player: any) {
              super(player, {
                title: 'Quality',
                name: 'QualityMenuButton',
              });
              
              // Get current quality label
              const currentLevel = hls.currentLevel;
              let currentLabel = 'Auto';
              if (currentLevel >= 0 && hls.levels && hls.levels[currentLevel]) {
                currentLabel = `${hls.levels[currentLevel].height}p`;
              }
              
              // Set control text
              this.controlText(currentLabel);
              
              // Update text display after element is created
              this.ready(() => {
                this.updateTextDisplay(currentLabel);
              });
            }

            updateTextDisplay(label: string) {
              const buttonEl = this.el();
              if (buttonEl) {
                const button = buttonEl.querySelector('button');
                if (button) {
                  // Remove any existing text spans
                  const existingText = button.querySelector('.vjs-quality-text');
                  if (existingText) {
                    existingText.remove();
                  }
                  
                  // Add text span
                  const textSpan = document.createElement('span');
                  textSpan.className = 'vjs-quality-text';
                  textSpan.textContent = label;
                  textSpan.style.display = 'inline-block';
                  textSpan.style.padding = '0 4px';
                  button.appendChild(textSpan);
                }
              }
            }
            
            updateButtonText() {
              const level = hls.currentLevel;
              let label = 'Auto';
              if (level >= 0 && hls.levels && hls.levels[level]) {
                label = `${hls.levels[level].height}p`;
              }
              this.controlText(label);
              this.updateTextDisplay(label);
            }

            createItems() {
              // Get current level to determine which item should be selected
              const currentLevel = hls.currentLevel;
              
              // Clear previous items
              this.menuItems = [];
              
              const items = qualityLevels.map((level: any) => {
                // Determine if this item should be selected
                const isSelected = currentLevel === level.value;
                
                const item = new MenuItem(this.player(), {
                  label: level.label,
                  selectable: true,
                  selected: isSelected,
                });

                // Store the level value on the item for later comparison
                (item as any).levelValue = level.value;

                item.on('click', () => {
                  // Set the HLS level
                  hls.currentLevel = level.value;
                  
                  // Update all items - only the clicked item should be selected
                  this.menuItems.forEach((i: any) => {
                    const itemLevelValue = (i as any).levelValue;
                    const shouldBeSelected = itemLevelValue === level.value;
                    i.selected(shouldBeSelected);
                  });
                  
                  // Update button text
                  const selectedLabel = level.label === 'Auto' ? 'Auto' : level.label;
                  this.controlText(selectedLabel);
                  this.updateTextDisplay(selectedLabel);
                });

                // Store item reference
                this.menuItems.push(item);
                
                return item;
              });
              
              return items;
            }
            
            // Override show method to refresh selected state when menu opens
            show() {
              super.show();
              // Small delay to ensure menu is rendered
              setTimeout(() => {
                this.refreshSelectedState();
              }, 10);
            }
            
            // Method to refresh the selected state of all menu items
            refreshSelectedState() {
              // Use stored menu items or try to get from menu
              const items = this.menuItems.length > 0 
                ? this.menuItems 
                : (this.menu?.children() as any[]) || [];
              
              if (items && items.length > 0) {
                const currentLevel = hls.currentLevel;
                
                items.forEach((item: any) => {
                  const itemLevelValue = (item as any).levelValue;
                  if (itemLevelValue !== undefined) {
                    const shouldBeSelected = itemLevelValue === currentLevel;
                    // Use selected() method to update the state
                    item.selected(shouldBeSelected);
                  }
                });
              }
            }
            
            // Override buildCSSClass to add custom styling
            buildCSSClass() {
              return `vjs-quality-button ${MenuButton.prototype.buildCSSClass.call(this)}`;
            }
            
            // Override createEl to ensure button displays text
            createEl() {
              const el = super.createEl();
              const button = el.querySelector('button');
              if (button) {
                button.style.minWidth = '60px';
                button.style.padding = '0 8px';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                // Hide the default icon
                const icon = button.querySelector('.vjs-icon-placeholder, .vjs-icon');
                if (icon) {
                  (icon as HTMLElement).style.display = 'none';
                }
              }
              return el;
            }
          }

          // Register quality button component (only once)
          try {
            videojs.registerComponent('QualityMenuButton', QualityMenuButton as any);
            console.log('[VideoPlayer] QualityMenuButton component registered');
          } catch (e) {
            // Component might already be registered, that's okay
            console.log('[VideoPlayer] QualityMenuButton already registered or registration failed:', e);
          }

          // Register and add quality button
          if (playerRef.current) {
            playerRef.current.ready(() => {
              try {
                // Check if button already exists
                const player = playerRef.current as any;
                if (player.controlBar) {
                  const existingButton = player.controlBar.getChild('QualityMenuButton');
                  if (existingButton) {
                    try {
                      player.controlBar.removeChild(existingButton);
                    } catch (e) {
                      console.warn('[VideoPlayer] Could not remove existing quality button:', e);
                    }
                  }
                  
                  console.log('[VideoPlayer] Creating quality button...');
                  const qualityButton = new QualityMenuButton(playerRef.current!);
                  qualityButtonRef.current = qualityButton;
                  
                  // Add button before fullscreen button (second to last)
                  const children = player.controlBar.children();
                  const insertIndex = Math.max(0, children.length - 1);
                  player.controlBar.addChild(qualityButton, {}, insertIndex);
                  
                  console.log('[VideoPlayer] Quality button added to control bar');
                  
                  // Ensure button is visible
                  setTimeout(() => {
                    const buttonEl = qualityButton.el();
                    if (buttonEl) {
                      buttonEl.style.display = 'inline-block';
                      buttonEl.style.visibility = 'visible';
                      console.log('[VideoPlayer] Quality button element:', buttonEl);
                    }
                  }, 100);
                  
                  // Listen to HLS level changes to update button text and menu selection
                  const levelSwitchedHandler = () => {
                    if (qualityButton) {
                      // Update button text
                      if (typeof (qualityButton as any).updateButtonText === 'function') {
                        (qualityButton as any).updateButtonText();
                      }
                      // Refresh menu selection state if menu is open
                      if (typeof (qualityButton as any).refreshSelectedState === 'function') {
                        (qualityButton as any).refreshSelectedState();
                      }
                    }
                  };
                  hls.on(Hls.Events.LEVEL_SWITCHED, levelSwitchedHandler);
                } else {
                  console.warn('[VideoPlayer] Control bar not available');
                }
              } catch (error) {
                console.error('[VideoPlayer] Error creating quality button:', error);
              }
            });
          } else {
            console.warn('[VideoPlayer] Player ref not available when creating quality button');
          }
        }
        setIsReady(true);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[VideoPlayer] HLS Error:', {
          type: data.type,
          fatal: data.fatal,
          details: data.details,
          error: data.error,
          url: data.url,
          response: data.response,
        });
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[VideoPlayer] Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[VideoPlayer] Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoPlayer] Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        } else {
          // Log non-fatal errors for debugging
          console.warn('[VideoPlayer] Non-fatal HLS error:', data.details);
        }
      });
      
      // Log when manifest is loaded
      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        console.log('[VideoPlayer] HLS manifest loaded successfully');
        setIsReady(true);
        
        // Try to play if autoplay is enabled
        if (autoplay && videoElement) {
          console.log('[VideoPlayer] Attempting autoplay...');
          videoElement.play().catch((error: Error) => {
            console.warn('[VideoPlayer] Autoplay failed:', error);
          });
        }
        
        // Ensure video is visible after manifest loads
        setTimeout(() => {
          if (playerRef.current) {
            const playerEl = playerRef.current.el();
            const videoEl = playerEl?.querySelector('video') || videoRef.current;
            
            // Trigger resize for fluid mode
            if (playerEl && playerEl.parentElement) {
              const parentWidth = playerEl.parentElement.offsetWidth || playerEl.parentElement.clientWidth;
              if (parentWidth > 0) {
                playerRef.current.trigger('resize');
              }
            }
            
            if (videoEl) {
              // Ensure video element is visible
              videoEl.style.display = 'block';
              videoEl.style.visibility = 'visible';
              videoEl.style.opacity = '1';
              
              console.log('[VideoPlayer] Video element state after manifest:', {
                offsetWidth: videoEl.offsetWidth,
                offsetHeight: videoEl.offsetHeight,
                clientWidth: videoEl.clientWidth,
                clientHeight: videoEl.clientHeight,
                display: window.getComputedStyle(videoEl).display,
                visibility: window.getComputedStyle(videoEl).visibility,
                opacity: window.getComputedStyle(videoEl).opacity,
                parentWidth: playerEl?.parentElement?.offsetWidth,
                readyState: videoEl.readyState,
                networkState: videoEl.networkState
              });
            }
          }
        }, 500);
      });

      // Log when level is loaded
      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('[VideoPlayer] HLS level loaded:', data.level);
      });

      // Log when fragment is loaded
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('[VideoPlayer] HLS fragment loaded:', data.frag.url);
      });

      // Cleanup HLS on src change
      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        // Cleanup quality button
        if (qualityButtonRef.current && playerRef.current) {
          const player = playerRef.current as any;
          if (player.controlBar) {
            try {
              player.controlBar.removeChild(qualityButtonRef.current);
            } catch (e) {
              console.warn('[VideoPlayer] Could not remove quality button on cleanup:', e);
            }
          }
          qualityButtonRef.current = null;
        }
        setIsReady(false);
      };
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      if (playerRef.current) {
        playerRef.current.src(src);
        setIsReady(true);
      }
    } else {
      console.error('HLS is not supported in this browser');
    }

    // Cleanup HLS on src change or unmount
    return () => {
      if (hlsRef.current) {
        console.log('[VideoPlayer] Cleaning up HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsReady(false);
    };
  }, [src, playerReady]); // Re-run when src changes or when player becomes ready

  // Set up event handlers and initial time
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady) {
      return;
    }

    // Set initial time if provided
    if (initialTime > 0 && player) {
      const currentPlayer = player;
      const setInitialTime = () => {
        if (!currentPlayer) return;
        const currentTime = currentPlayer.currentTime() || 0;
        if (currentTime === 0 || Math.abs(currentTime - initialTime) > 1) {
          currentPlayer.currentTime(initialTime);
        }
      };

      player.ready(() => {
        // Wait a bit for HLS to load
        setTimeout(setInitialTime, 500);
      });

      // Also set on loadedmetadata
      player.on('loadedmetadata', setInitialTime);
    }

    // Get current quality from HLS
    const getCurrentQuality = () => {
      if (hlsRef.current && hlsRef.current.levels && hlsRef.current.currentLevel >= 0) {
        const level = hlsRef.current.levels[hlsRef.current.currentLevel];
        return level ? `${level.height}p` : 'auto';
      }
      return 'auto';
    };

    // Handle play event
    const handlePlay = () => {
      setIsPlaying(true);
      if (!hasPlayed) {
        setHasPlayed(true);
      }
      const currentTime = Math.floor(player.currentTime() || 0);
      const duration = Math.floor(player.duration() || videoDuration || 0);
      const playEventData: any = {
        eventType: 'VIDEO_PLAY',
        currentTime,
        duration,
        playbackQuality: getCurrentQuality(),
      };
      if (videoId) playEventData.videoId = videoId;
      if (lessonId) playEventData.lessonId = lessonId;
      analytics.track(playEventData);
      // Call lesson-specific callback if provided
      if (onPlayCallback) {
        onPlayCallback();
      }
    };

    // Handle pause event
    const handlePause = () => {
      setIsPlaying(false);
      if (hasPlayed) {
        const currentTime = Math.floor(player.currentTime() || 0);
        const duration = Math.floor(player.duration() || videoDuration || 0);
        const pauseEventData: any = {
          eventType: 'VIDEO_PAUSE',
          currentTime,
          duration,
          playbackQuality: getCurrentQuality(),
        };
        if (videoId) pauseEventData.videoId = videoId;
        if (lessonId) pauseEventData.lessonId = lessonId;
        analytics.track(pauseEventData);
        // Call lesson-specific callback if provided
        if (onPauseCallback) {
          onPauseCallback();
        }
      }
    };

    // Handle progress updates - send every 5-10 seconds
    const handleTimeUpdate = () => {
      const currentTime = Math.floor(player.currentTime() || 0);
      const duration = Math.floor(player.duration() || videoDuration || 0);
      
      if (onProgressUpdate) {
        onProgressUpdate(currentTime);
      }

      // Call lesson-specific progress callback if provided
      if (onProgress && duration > 0) {
        onProgress(currentTime, duration);
      }

      // Track PROGRESS event every 5-10 seconds
      if (hasPlayed && isPlaying) {
        const timeSinceLastProgress = currentTime - lastProgressSentRef.current;
        if (timeSinceLastProgress >= 5) {
          const progressEventData: any = {
            eventType: 'VIDEO_PROGRESS',
            currentTime,
            duration,
            playbackQuality: getCurrentQuality(),
          };
          if (videoId) progressEventData.videoId = videoId;
          if (lessonId) progressEventData.lessonId = lessonId;
          analytics.track(progressEventData);
          lastProgressSentRef.current = currentTime;
        }
      }
    };

    // Update progress every second
    progressIntervalRef.current = setInterval(() => {
      if (player.currentTime() !== null) {
        handleTimeUpdate();
      }
    }, 1000);

    // Handle video end
    const handleEnded = () => {
      const duration = Math.floor(player.duration() || videoDuration || 0);
      const completeEventData: any = {
        eventType: 'VIDEO_COMPLETE',
        currentTime: duration,
        duration,
        playbackQuality: getCurrentQuality(),
      };
      if (videoId) completeEventData.videoId = videoId;
      if (lessonId) completeEventData.lessonId = lessonId;
      analytics.track(completeEventData);
      // Call lesson-specific completion callback if provided
      if (onCompleteCallback) {
        onCompleteCallback();
      }
      // Also call video end callback for backward compatibility
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    // Handle seeking
    const handleSeeking = () => {
      const currentTime = Math.floor(player.currentTime() || 0);
      const duration = Math.floor(player.duration() || videoDuration || 0);
      const seekEventData: any = {
        eventType: 'VIDEO_SEEK',
        currentTime,
        duration,
        playbackQuality: getCurrentQuality(),
      };
      if (videoId) seekEventData.videoId = videoId;
      if (lessonId) seekEventData.lessonId = lessonId;
      analytics.track(seekEventData);
    };

    // Handle buffering
    const handleWaiting = () => {
      const currentTime = Math.floor(player.currentTime() || 0);
      const duration = Math.floor(player.duration() || videoDuration || 0);
      const bufferEventData: any = {
        eventType: 'VIDEO_BUFFER',
        currentTime,
        duration,
        playbackQuality: getCurrentQuality(),
      };
      if (videoId) bufferEventData.videoId = videoId;
      if (lessonId) bufferEventData.lessonId = lessonId;
      analytics.track(bufferEventData);
    };

    // Track duration when metadata loads
    player.on('loadedmetadata', () => {
      const duration = Math.floor(player.duration() || 0);
      if (duration > 0) {
        setVideoDuration(duration);
      }
    });

    player.on('play', handlePlay);
    player.on('pause', handlePause);
    player.on('ended', handleEnded);
    player.on('seeking', handleSeeking);
    player.on('waiting', handleWaiting);

    // Keyboard shortcuts - work when player or video is focused
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player) return;
      
      // Only handle if video player is focused or if it's a global shortcut
      const playerEl = player.el();
      const isPlayerFocused =
        document.activeElement === videoRef.current ||
        (videoRef.current && videoRef.current.contains(document.activeElement)) ||
        (playerEl && playerEl.contains(document.activeElement));

      // Allow space and arrow keys only when player is focused (to avoid conflicts with page scrolling)
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !isPlayerFocused) {
        return;
      }

      // Allow k, f, m globally when player exists
      if (!['k', 'f', 'm', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case 'f':
          e.preventDefault();
          if (player.isFullscreen()) {
            player.exitFullscreen();
          } else {
            player.requestFullscreen();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.currentTime(Math.max(0, (player.currentTime() || 0) - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.currentTime((player.currentTime() || 0) + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.volume(Math.min(1, (player.volume() || 0) + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.volume(Math.max(0, (player.volume() || 0) - 0.1));
          break;
        case 'm':
          e.preventDefault();
          player.muted(!player.muted());
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
      }
      document.removeEventListener('keydown', handleKeyDown);
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('ended', handleEnded);
      player.off('seeking', handleSeeking);
      player.off('waiting', handleWaiting);
    };
  }, [isReady, initialTime, onProgressUpdate, onProgress, onVideoEnd, onPlayCallback, onPauseCallback, onCompleteCallback, hasPlayed, isPlaying, videoId, lessonId, videoDuration]);

  // Handle focus mode changes separately
  useEffect(() => {
    if (!playerRef.current || !isReady) return;

    const player = playerRef.current;
    const getCurrentTime = () => Math.floor(player.currentTime() || 0);
    const getDuration = () => Math.floor(player.duration() || videoDuration || 0);

    if (isFocusMode && !focusModeActive) {
      // Entering focus mode
      setFocusModeActive(true);
      if (videoId || lessonId) {
        const focusStartData: any = {
          eventType: 'FOCUS_MODE_START',
          currentTime: getCurrentTime(),
          duration: getDuration(),
        };
        if (videoId) focusStartData.videoId = videoId;
        if (lessonId) focusStartData.lessonId = lessonId;
        analytics.track(focusStartData);
      }
      if (onFocusStart) {
        onFocusStart();
      }
    } else if (!isFocusMode && focusModeActive) {
      // Exiting focus mode
      setFocusModeActive(false);
      if (videoId || lessonId) {
        const focusEndData: any = {
          eventType: 'FOCUS_MODE_END',
          currentTime: getCurrentTime(),
          duration: getDuration(),
        };
        if (videoId) focusEndData.videoId = videoId;
        if (lessonId) focusEndData.lessonId = lessonId;
        analytics.track(focusEndData);
      }
      if (onFocusEnd) {
        onFocusEnd();
      }
    }
  }, [isFocusMode, focusModeActive, onFocusStart, onFocusEnd, isReady, videoId, videoDuration]);

  // Handle window resize to maintain player dimensions
  useEffect(() => {
    if (!playerRef.current || !isReady) return;

    const handleResize = () => {
      if (playerRef.current) {
        const playerEl = playerRef.current.el();
        if (playerEl && playerEl.parentElement) {
          const parentWidth = playerEl.parentElement.offsetWidth || playerEl.parentElement.clientWidth;
          if (parentWidth > 0) {
            playerRef.current.trigger('resize');
          }
        }
      }
    };

    // Debounce resize events
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    
    // Also trigger on mount to ensure initial sizing
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [isReady]);

  return (
    <div 
      className="video-player-container w-full bg-black" 
      style={{ 
        position: 'relative', 
        zIndex: 25,
        width: '100%',
        minHeight: '400px'
      }}
    >
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-fluid"
        playsInline
        data-setup="{}"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          minHeight: '400px'
        }}
      />
    </div>
  );
}
