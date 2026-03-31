/**
 * Extended Booking model with user email for cancellation notifications.
 * The original Booking interface lacks userEmail; this version adds it.
 */
export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userEmail: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

export interface CreateBookingInput {
  roomId: string;
  userId: string;
  userEmail: string;
  startTime: Date;
  endTime: Date;
  title: string;
}
