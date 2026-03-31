/**
 * Extended Room model with owner information for notifications.
 * The original Room model lacks ownerEmail; this version adds it.
 */
export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  amenities: string[];
  ownerEmail: string;
}
