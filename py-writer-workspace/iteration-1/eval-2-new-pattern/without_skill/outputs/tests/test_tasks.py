from unittest.mock import patch

from app import tasks


def test_send_confirmation_email_calls_service():
    order = {"id": "order-1", "user_id": "u1", "items": []}
    with patch.object(tasks, "OrderService") as mock_cls:
        tasks.send_confirmation_email(order)
        mock_cls.return_value.send_confirmation_email.assert_called_once_with(order)


def test_generate_invoice_calls_service():
    order = {"id": "order-1", "user_id": "u1", "items": []}
    with patch.object(tasks, "OrderService") as mock_cls:
        tasks.generate_invoice(order)
        mock_cls.return_value.generate_invoice.assert_called_once_with(order)


def test_notify_warehouse_calls_service():
    order = {"id": "order-1", "user_id": "u1", "items": []}
    with patch.object(tasks, "OrderService") as mock_cls:
        tasks.notify_warehouse(order)
        mock_cls.return_value.notify_warehouse.assert_called_once_with(order)
