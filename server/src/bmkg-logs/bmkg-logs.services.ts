import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ObjectId } from 'mongodb';
import { EarthquakeAlert } from './models/earthquake-alert.model';
import { BmkgAlert } from './models/bmkg-alert.model';
import { BmkgPolygonCentroid } from './models/bmkg-polygon-centroid.model';

const EARTHQUAKE_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const BMKG_RSS_URL = 'https://www.bmkg.go.id/alerts/nowcast/en/rss.xml';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const NOWCAST_POLL_INTERVAL_MS = 15 * 60 * 1000;

const DANGEROUS_SEVERITIES = ['Extreme', 'Severe', 'Moderate'];

interface BmkgGempa {
  Tanggal: string;
  Jam: string;
  Coordinates: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
}

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

function polygonCentroid(polygon: number[][][]): [number, number] {
  const ring = polygon[0];
  let sumLon = 0;
  let sumLat = 0;
  for (const point of ring) {
    sumLon += point[0];
    sumLat += point[1];
  }
  return [sumLon / ring.length, sumLat / ring.length];
}

function parsePolygons(polygons: string[]): number[][][][] {
  return polygons.map((poly) => {
    const ring: number[][] = poly
      .trim()
      .split(/\s+/)
      .map((pair): number[] => {
        const [lat, lon] = pair.split(',').map(Number);
        return [lon, lat];
      })
      .filter((pt) => !isNaN(pt[0]) && !isNaN(pt[1]));

    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
    }

    return [ring];
  });
}

@Injectable()
export class BmkgLogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BmkgLogsService.name);
  private pollingTimer: NodeJS.Timeout;
  private nowcastTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(EarthquakeAlert)
    private earthquakeModel: typeof EarthquakeAlert,
    @InjectModel(BmkgAlert)
    private bmkgAlertModel: typeof BmkgAlert,
    @InjectModel(BmkgPolygonCentroid)
    private centroidModel: typeof BmkgPolygonCentroid,
  ) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  onModuleInit() {
    void this.pollEarthquake();
    this.pollingTimer = setInterval(
      () => void this.pollEarthquake(),
      POLL_INTERVAL_MS,
    );

    void this.pollNowcast();
    this.nowcastTimer = setInterval(
      () => void this.pollNowcast(),
      NOWCAST_POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.pollingTimer);
    clearInterval(this.nowcastTimer);
  }

  private async pollNowcast() {
    try {
      await this.purgeExpiredAlerts();
      const results = await this.fetchAndStoreNowcastAlerts();
      this.logger.log(`[Nowcast] synced — ${results.length} new alert(s)`);
    } catch (err) {
      this.logger.error('[Nowcast] sync failed', err);
    }
  }

  private async purgeExpiredAlerts(): Promise<void> {
    const cutoff = new Date().toISOString();
    const stale = await this.bmkgAlertModel
      .where('expires', { $lt: cutoff })
      .get();
    for (const alert of stale as unknown as BmkgAlert[]) {
      await this.bmkgAlertModel.destroy(alert._id.toString());
    }

    const staleCentroids = await this.centroidModel
      .where('expires', { $lt: cutoff })
      .get();
    for (const c of staleCentroids as unknown as { _id: string }[]) {
      await this.centroidModel.destroy(c._id.toString());
    }

    const purged = (stale as unknown[]).length;
    if (purged > 0) {
      this.logger.log(`[Nowcast] purged ${purged} expired alert(s)`);
    }
  }

  private async pollEarthquake() {
    try {
      const result = await this.syncEarthquakeAlert();
      this.logger.log(
        `[Earthquake] synced — ${result.tanggal} ${result.jam} M${result.magnitude}`,
      );
    } catch (err) {
      this.logger.error('[Earthquake] sync failed', err);
    }
  }

  // ─── Earthquake ──────────────────────────────────────────────────────────────

  async syncEarthquakeAlert(): Promise<EarthquakeAlert> {
    const body = await this.fetchText(EARTHQUAKE_URL);
    const json = JSON.parse(body) as { Infogempa: { gempa: BmkgGempa } };
    const gempa = json.Infogempa.gempa;

    const tanggal = gempa.Tanggal;
    const jam = gempa.Jam;

    const existing = await this.earthquakeModel
      .where('tanggal', tanggal)
      .where('jam', jam)
      .get();

    if (existing.length > 0) return existing[0] as unknown as EarthquakeAlert;

    const [lat, lon] = gempa.Coordinates.split(',').map(Number);

    const result = await this.earthquakeModel.create({
      tanggal,
      jam,
      location: { type: 'Point', coordinates: [lon, lat] },
      magnitude: parseFloat(gempa.Magnitude),
      kedalaman: gempa.Kedalaman,
      wilayah: gempa.Wilayah,
      fetchedAt: new Date(),
    });
    return result as unknown as EarthquakeAlert;
  }

  async getEarthquakeAlerts(limit: number): Promise<EarthquakeAlert[]> {
    const results = await this.earthquakeModel
      .orderBy('fetchedAt', 'desc')
      .limit(limit)
      .get();
    return results as unknown as EarthquakeAlert[];
  }

  // ─── Nowcast Alerts ──────────────────────────────────────────────────────────

  async fetchAndStoreNowcastAlerts(): Promise<BmkgAlert[]> {
    let rssText: string;
    try {
      rssText = await this.fetchText(BMKG_RSS_URL);
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
        capXml = await this.fetchText(link);
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

      const coordinates = parsePolygons(polygons);
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
        location: { type: 'MultiPolygon', coordinates },
        alertUrl: link,
        isDangerous,
        fetchedAt: new Date(),
      });

      const alert = result as unknown as BmkgAlert;
      for (const polygon of coordinates) {
        const [cLon, cLat] = polygonCentroid(polygon);
        await this.centroidModel.create({
          alertId: new ObjectId(alert._id.toString()),
          centroid: { type: 'Point', coordinates: [cLon, cLat] },
          severity,
          isDangerous,
          expires,
        });
      }
      stored.push(alert);
    }

    return stored;
  }

  async getNowcastAlerts(): Promise<BmkgAlert[]> {
    const results = await this.bmkgAlertModel
      .orderBy('fetchedAt', 'desc')
      .get();
    return results as unknown as BmkgAlert[];
  }

  async getActiveNowcastAlerts(): Promise<BmkgAlert[]> {
    const now = new Date().toISOString();
    const all = await this.bmkgAlertModel.orderBy('fetchedAt', 'desc').get();
    return (all as unknown as BmkgAlert[]).filter((alert) => {
      if (!alert.expires) return true;
      return alert.expires > now;
    });
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'resQ-app/1.0' },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new InternalServerErrorException(
          `BMKG request failed: ${url} (${res.status})`,
        );
      }
      return await res.text();
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Network error fetching ${url}: ${msg}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
