export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

export interface CreateBookingInput {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
}
