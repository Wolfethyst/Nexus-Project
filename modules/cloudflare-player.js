// Cloudflare Stream Player Integration
// Provides quality selection and adaptive bitrate streaming for Cloudflare Stream videos

import { CLOUDFLARE_CUSTOMER } from './config.js';

let currentCloudflarePlayer = null;
let availableQualities = [];

/**
 * Initialize and play a video using Cloudflare Stream Player
 * @param {string} videoId - Cloudflare Stream video ID
 * @param {HTMLElement} container - Container element for the player
 * @returns {Promise<void>}
 */
export async function initCloudflarePlayer(videoId, container) {
  if (!container) {
    console.error('Container element not found for Cloudflare player');
    return;
  }

  // Clean up any existing player
  if (currentCloudflarePlayer) {
    try {
      currentCloudflarePlayer.destroy?.();
    } catch (e) {
      console.warn('Error destroying previous player:', e);
    }
  }

  // Create wrapper div for the Stream player
  const wrapper = document.createElement('div');
  wrapper.id = 'nexus-cloudflare-embed';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.backgroundColor = '#000';
  wrapper.style.position = 'relative';

  // Clear container
  container.innerHTML = '';
  container.appendChild(wrapper);

  try {
    // Load Cloudflare Stream Embed script if not already loaded
    if (typeof window.Stream === 'undefined') {
      await loadCloudflareStreamScript();
    }

    // Initialize the Cloudflare Stream player
    if (window.Stream) {
      currentCloudflarePlayer = new window.Stream({
        src: videoId,
        poster: `https://customer-${getCloudflareCustomerId()}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`,
        controls: ['play-large', 'play', 'progress', 'duration', 'volume', 'mute', 'settings', 'fullscreen'],
        responsive: true,
        preload: 'metadata',
        autoplay: true,
        muted: false,
        loop: false,
        speed: { selected: 1, options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        quality: {
          default: 'auto',
          options: ['auto', '360p', '720p', '1080p'],
          forced: false,
          onChange: (quality) => handleQualityChange(quality),
        },
      });

      // Attach to the wrapper
      currentCloudflarePlayer.attachTo(wrapper);

      // Extract available qualities from the video manifest
      await extractQualities(videoId);

      console.log('Cloudflare Stream player initialized successfully');
    } else {
      throw new Error('Cloudflare Stream library not loaded');
    }
  } catch (error) {
    console.error('Failed to initialize Cloudflare Stream player:', error);
    // Fallback to iframe embed if initialization fails
    createCloudflareIframeEmbed(videoId, wrapper);
  }
}

/**
 * Load the Cloudflare Stream Embed script
 * @returns {Promise<void>}
 */
function loadCloudflareStreamScript() {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector('script[src*="cloudflarestream.com/embed"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://embed.cloudflarestream.com/embed/ujsnowflakes.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cloudflare Stream script'));
    document.head.appendChild(script);
  });
}

/**
 * Get Cloudflare customer ID from config
 * @returns {string}
 */
function getCloudflareCustomerId() {
  return CLOUDFLARE_CUSTOMER || 'unknown';
}

/**
 * Extract available quality options from HLS manifest
 * @param {string} videoId - Cloudflare Stream video ID
 */
async function extractQualities(videoId) {
  try {
    const customerId = getCloudflareCustomerId();
    const manifestUrl = `https://customer-${customerId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;

    const response = await fetch(manifestUrl);
    const manifest = await response.text();

    // Parse M3U8 manifest to extract quality info
    const qualityRegex = /#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+)/g;
    let match;
    availableQualities = [];

    while ((match = qualityRegex.exec(manifest)) !== null) {
      const resolution = match[1];
      const [width, height] = resolution.split('x').map(Number);
      availableQualities.push({
        label: `${height}p`,
        value: height,
        resolution: resolution,
      });
    }

    // Remove duplicates and sort by height descending
    availableQualities = [...new Map(availableQualities.map(q => [q.value, q])).values()]
      .sort((a, b) => b.value - a.value);

    console.log('Available qualities:', availableQualities);
    updateQualitySelector();
  } catch (error) {
    console.warn('Could not extract qualities from manifest:', error);
    // Cloudflare Stream player will handle quality selection automatically
    availableQualities = [];
  }
}

/**
 * Handle quality change events
 * @param {string} quality - Selected quality (e.g., '720p', 'auto')
 */
function handleQualityChange(quality) {
  console.log('Quality changed to:', quality);
  const qualitySelect = document.getElementById('videoQualitySelect');
  if (qualitySelect) {
    qualitySelect.value = quality;
  }
  
  // Dispatch custom event for external listeners
  window.dispatchEvent(
    new CustomEvent('cloudflare-quality-changed', { detail: { quality } })
  );
}

/**
 * Update quality selector dropdown with available options
 */
function updateQualitySelector() {
  const qualitySelect = document.getElementById('videoQualitySelect');
  if (!qualitySelect) return;

  // Clear existing options
  qualitySelect.innerHTML = '<option value="auto">Auto (Recommended)</option>';

  availableQualities.forEach(quality => {
    const option = document.createElement('option');
    option.value = quality.label;
    option.textContent = quality.label;
    qualitySelect.appendChild(option);
  });

  // Show the selector if we have options
  qualitySelect.style.display = availableQualities.length > 0 ? 'block' : 'none';

  // Add change handler
  qualitySelect.onchange = (e) => {
    if (currentCloudflarePlayer && currentCloudflarePlayer.setQuality) {
      currentCloudflarePlayer.setQuality(e.target.value);
    }
  };
}

/**
 * Fallback: Create an iframe embed for Cloudflare Stream
 * @param {string} videoId - Cloudflare Stream video ID
 * @param {HTMLElement} wrapper - Wrapper element
 */
function createCloudflareIframeEmbed(videoId, wrapper) {
  const customerId = getCloudflareCustomerId();
  const iframe = document.createElement('iframe');
  iframe.src = `https://customer-${customerId}.cloudflarestream.com/${videoId}/iframe?preload=metadata&autoplay=true`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.allowFullscreen = true;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';

  wrapper.innerHTML = '';
  wrapper.appendChild(iframe);

  // Update quality selector to show available options from iframe
  const qualitySelect = document.getElementById('videoQualitySelect');
  if (qualitySelect) {
    qualitySelect.innerHTML = '<option value="auto">Auto (Recommended)</option>';
    ['1080p', '720p', '480p', '360p'].forEach(res => {
      const option = document.createElement('option');
      option.value = res;
      option.textContent = res;
      qualitySelect.appendChild(option);
    });
    qualitySelect.style.display = 'block';
  }

  console.log('Using Cloudflare Stream iframe embed');
}

/**
 * Get the current quality setting
 * @returns {string|null}
 */
export function getCurrentQuality() {
  const qualitySelect = document.getElementById('videoQualitySelect');
  return qualitySelect ? qualitySelect.value : null;
}

/**
 * Set quality to specific resolution
 * @param {string} quality - Quality label (e.g., '720p', 'auto')
 */
export function setQuality(quality) {
  const qualitySelect = document.getElementById('videoQualitySelect');
  if (qualitySelect) {
    qualitySelect.value = quality;
    qualitySelect.dispatchEvent(new Event('change'));
  }

  if (currentCloudflarePlayer && currentCloudflarePlayer.setQuality) {
    currentCloudflarePlayer.setQuality(quality);
  }
}

/**
 * Destroy the current player
 */
export function destroyCloudflarePlayer() {
  if (currentCloudflarePlayer) {
    try {
      currentCloudflarePlayer.destroy?.();
    } catch (e) {
      console.warn('Error destroying player:', e);
    }
    currentCloudflarePlayer = null;
  }

  const wrapper = document.getElementById('nexus-cloudflare-embed');
  if (wrapper) {
    wrapper.remove();
  }

  availableQualities = [];

  // Hide quality selector
  const qualitySelect = document.getElementById('videoQualitySelect');
  if (qualitySelect) {
    qualitySelect.style.display = 'none';
  }
}

/**
 * Check if a video is hosted on Cloudflare Stream
 * @param {Object} item - Video item
 * @returns {boolean}
 */
export function isCloudflareStream(item) {
  return (
    (item.vod_provider === 'cloudflare' || item.vod_provider === 'cf_stream') &&
    (item.cloudflare_id || item.videoId)
  );
}

/**
 * Get Cloudflare Stream video ID
 * @param {Object} item - Video item
 * @returns {string|null}
 */
export function getCloudflareVideoId(item) {
  return item.cloudflare_id || item.videoId || null;
}
