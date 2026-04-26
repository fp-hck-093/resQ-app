import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { BmkgAlert } from './models/bmkg-alert.model';

const BMKG_RSS_URL = 'https://www.bmkg.go.id/alerts/nowcast/en/rss.xml';

const DANGEROUS_SEVERITIES = ['Extreme', 'Severe', 'Moderate'];

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

function computeCentroid(polygons: string[]): { lat: number; lon: number } {
  let sumLat = 0;
  let sumLon = 0;
  let count = 0;

  for (const poly of polygons) {
    const pairs = poly.trim().split(/\s+/);
    for (const pair of pairs) {
      const [lat, lon] = pair.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        sumLat += lat;
        sumLon += lon;
        count++;
      }
    }
  }

  if (count === 0) return { lat: 0, lon: 0 };
  return { lat: sumLat / count, lon: sumLon / count };
}

@Injectable()
export class BmkgService {
  constructor(
    @InjectModel(BmkgAlert) private bmkgAlertModel: typeof BmkgAlert,
  ) {}

  async fetchAndStoreAll(): Promise<BmkgAlert[]> {
    let rssText: string;
    try {
      const res = await fetch(BMKG_RSS_URL);
      if (!res.ok)
        throw new Error(`RSS fetch failed with status ${res.status}`);
      rssText = await res.text();
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to fetch BMKG RSS: ${(err as Error).message}`,
      );
    }

    const itemMatches = rssText.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const stored: BmkgAlert[] = [];

    for (const itemXml of itemMatches) {
      const guid = extractTag(itemXml, 'guid');
      const link = extractTag(itemXml, 'link');
      const title = extractTag(itemXml, 'title');

      if (!link) continue;

      const existing = await this.bmkgAlertModel
        .where('identifier', guid)
        .first();
      if (existing) continue;

      let capXml: string;
      try {
        const capRes = await fetch(link);
        if (!capRes.ok) continue;
        capXml = await capRes.text();
      } catch {
        continue;
      }

      const identifier = extractTag(capXml, 'identifier') || guid;
      const event = extractTag(capXml, 'event');
      const urgency = extractTag(capXml, 'urgency');
      const severity = extractTag(capXml, 'severity');
      const certainty = extractTag(capXml, 'certainty');
      const effective = extractTag(capXml, 'effective');
      const expires = extractTag(capXml, 'expires');
      const headline = extractTag(capXml, 'headline');
      const description = extractTag(capXml, 'description');
      const areaDesc = extractAllTags(capXml, 'areaDesc').join('; ');
      const polygons = extractAllTags(capXml, 'polygon');

      const { lat, lon } = computeCentroid(polygons);

      const isDangerous = DANGEROUS_SEVERITIES.includes(severity);

      const result = await this.bmkgAlertModel.create({
        identifier,
        title: headline || title,
        event,
        urgency,
        severity,
        certainty,
        areaDesc,
        description,
        effective,
        expires,
        location: { type: 'Point', coordinates: [lon, lat] },
        alertUrl: link,
        isDangerous,
        fetchedAt: new Date(),
      });

      stored.push(result as unknown as BmkgAlert);
    }

    return stored;
  }

  async getAll(): Promise<BmkgAlert[]> {
    const results = await this.bmkgAlertModel
      .orderBy('fetchedAt', 'desc')
      .get();
    return results as unknown as BmkgAlert[];
  }

  async getActive(): Promise<BmkgAlert[]> {
    const now = new Date().toISOString();
    const all = await this.bmkgAlertModel.orderBy('fetchedAt', 'desc').get();

    return (all as unknown as BmkgAlert[]).filter((alert) => {
      if (!alert.expires) return true;
      return alert.expires > now;
    });
  }
}
