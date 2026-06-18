import { buildFlagCdnUrl } from './flag-url.util';
import {
  FLAG_CDN_BASE_URL,
  FLAG_CDN_EXTENSION,
  FLAG_CDN_SIZE,
} from '../constants/flag-cdn.constants';

describe('buildFlagCdnUrl', () => {
  it('builds a full flag URL from a country code', () => {
    expect(buildFlagCdnUrl('ar')).toBe(
      `${FLAG_CDN_BASE_URL}${FLAG_CDN_SIZE}/ar${FLAG_CDN_EXTENSION}`,
    );
  });

  it('normalizes country codes to lowercase', () => {
    expect(buildFlagCdnUrl('EG')).toBe(
      `${FLAG_CDN_BASE_URL}${FLAG_CDN_SIZE}/eg${FLAG_CDN_EXTENSION}`,
    );
  });

  it('returns an already-built flagcdn URL unchanged', () => {
    const url = `${FLAG_CDN_BASE_URL}${FLAG_CDN_SIZE}/ar${FLAG_CDN_EXTENSION}`;
    expect(buildFlagCdnUrl(url)).toBe(url);
  });
});
