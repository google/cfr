export interface TravelSegment {
  startTime: Long;
  endTime: Long;
  duration: Long;
  distanceMeters: number;
  accumulatedDistanceMeters: number;
  speed: number;
}

export type TravelCurve = TravelSegment[];
