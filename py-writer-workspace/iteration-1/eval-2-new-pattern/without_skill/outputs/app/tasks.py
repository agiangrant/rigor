"""Background tasks for order processing.

Each function is a standalone callable that rq can serialize and execute
in a worker process. They instantiate OrderService themselves so they
are fully self-contained.
"""

from app.services import OrderService


def send_confirmation_email(order: dict) -> None:
    service = OrderService()
    service.send_confirmation_email(order)


def generate_invoice(order: dict) -> None:
    service = OrderService()
    service.generate_invoice(order)


def notify_warehouse(order: dict) -> None:
    service = OrderService()
    service.notify_warehouse(order)
