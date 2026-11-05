// src/lib/geolocation.ts
import type { GeoResult } from '../types/geo';

/**
 * Perform IP geolocation using a configured provider.
 * Currently supports ipapi (default) – you can replace the URL with another provider.
 */
export async function lookupIp(ip: string): Promise<GeoResult | null> {
  const provider = process.env.GEOLOCATION_PROVIDER ?? 'ipapi';
  const apiKey = process.env.GEOLOCATION_API_KEY ?? '';

  try {
    if (provider === 'ipapi') {
      const url = `https://ipapi.co/${ip}/json/` + (apiKey ? `?key=${apiKey}` : '');
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        ip: data.ip,
        country: data.country_name,
        country_code: data.country_code,
        region: data.region,
        city: data.city,
        postal_code: data.postal,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timezone: data.timezone,
        isp: data.org,
        asn: data.asn,
      };
    }
    // Add other providers here.
    return null;
  } catch (e) {
    console.error('Geolocation lookup failed', e);
    return null;
  }
}
