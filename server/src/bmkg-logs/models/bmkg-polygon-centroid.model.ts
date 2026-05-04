import { Model } from 'mongoloquent';
import { ObjectId } from 'mongodb';

export interface IBmkgPolygonCentroid {
  _id?: string;
  alertId: ObjectId;
  centroid: { type: string; coordinates: number[] };
  severity: string;
  isDangerous: boolean;
  expires: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BmkgPolygonCentroid extends Model<IBmkgPolygonCentroid> {
  public static $schema: IBmkgPolygonCentroid;
  protected $collection: string = 'bmkg_polygon_centroids';
}
