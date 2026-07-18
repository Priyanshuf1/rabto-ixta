/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TerminalLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'system';
}

export interface InstagramTarget {
  username: string;
  userId: string;
  status: 'DISCOVERED' | 'STANDBY' | 'DECRYPTING' | 'LOCKED';
  ipAddress?: string;
  followers?: string;
  following?: string;
  postsCount?: number;
  isPrivate?: boolean;
}

export interface CarouselImage {
  id: string;
  url: string;
  caption: string;
}
