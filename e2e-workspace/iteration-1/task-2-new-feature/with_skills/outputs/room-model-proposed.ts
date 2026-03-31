/**
 * Proposed Room model update — adds ownerId.
 *
 * This change is blocked on Question 3 (Room Owner Identity).
 * Showing the proposed shape for Option A (ownerId + UserService).
 *
 * Intended location: src/models/room.ts (replaces existing)
 */

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  amenities: string[];
  ownerId: string; // NEW: references a User who owns this room
}
