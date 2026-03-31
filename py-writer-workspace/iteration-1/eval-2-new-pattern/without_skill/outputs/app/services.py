import time


class OrderService:
    def create(self, user_id: str, items: list) -> dict:
        return {"id": "order-1", "user_id": user_id, "items": items, "status": "pending"}

    def send_confirmation_email(self, order: dict) -> None:
        time.sleep(1)  # Simulates slow SMTP

    def generate_invoice(self, order: dict) -> None:
        time.sleep(1.5)  # Simulates slow PDF generation

    def notify_warehouse(self, order: dict) -> None:
        time.sleep(0.5)  # Simulates webhook
