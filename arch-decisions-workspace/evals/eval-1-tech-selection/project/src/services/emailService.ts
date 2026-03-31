import nodemailer from 'nodemailer';

export const emailService = {
  async sendOrderConfirmation(order: any) {
    // ~500ms — connects to SMTP server
  },
  async sendShippingNotification(order: any) {},
  async sendRefundConfirmation(order: any) {},
};
