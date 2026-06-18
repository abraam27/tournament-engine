import {
  FLAG_CDN_BASE_URL,
  FLAG_CDN_EXTENSION,
  FLAG_CDN_SIZE,
} from '../constants/flag-cdn.constants';

export function buildFlagCdnUrl(flagCode: string): string {
  const value = flagCode.trim();
  const normalizedBase = FLAG_CDN_BASE_URL.replace(/\/$/, '');

  if (value.startsWith(normalizedBase)) {
    return value;
  }

  return `${FLAG_CDN_BASE_URL}${FLAG_CDN_SIZE}/${value.toLowerCase()}${FLAG_CDN_EXTENSION}`;
}
