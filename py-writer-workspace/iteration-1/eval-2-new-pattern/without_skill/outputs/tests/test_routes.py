import json
from unittest.mock import MagicMock, patch

from app import create_app


def test_create_order_enqueues_tasks():
    """The endpoint should enqueue three background tasks, not call services directly."""
    mock_queue = MagicMock()

    app = create_app()
    app.config["RQ_QUEUE"] = mock_queue

    with app.test_client() as client:
        response = client.post(
            "/orders",
            data=json.dumps({"user_id": "u1", "items": [{"product_id": "p1", "qty": 2}]}),
            content_type="application/json",
        )

    assert response.status_code == 201
    assert mock_queue.enqueue.call_count == 3

    enqueued_funcs = [call.args[0].__name__ for call in mock_queue.enqueue.call_args_list]
    assert "send_confirmation_email" in enqueued_funcs
    assert "generate_invoice" in enqueued_funcs
    assert "notify_warehouse" in enqueued_funcs


def test_create_order_returns_order_even_if_enqueue_fails():
    """If Redis is down, the order should still be returned."""
    mock_queue = MagicMock()
    mock_queue.enqueue.side_effect = ConnectionError("Redis unavailable")

    app = create_app()
    app.config["RQ_QUEUE"] = mock_queue

    with app.test_client() as client:
        response = client.post(
            "/orders",
            data=json.dumps({"user_id": "u1", "items": [{"product_id": "p1", "qty": 1}]}),
            content_type="application/json",
        )

    assert response.status_code == 201
    body = response.get_json()
    assert body["id"] == "order-1"


def test_create_order_response_time_is_fast():
    """The endpoint should respond in well under 1 second (no blocking side-effects)."""
    import time

    mock_queue = MagicMock()

    app = create_app()
    app.config["RQ_QUEUE"] = mock_queue

    with app.test_client() as client:
        start = time.monotonic()
        response = client.post(
            "/orders",
            data=json.dumps({"user_id": "u1", "items": [{"product_id": "p1", "qty": 1}]}),
            content_type="application/json",
        )
        elapsed = time.monotonic() - start

    assert response.status_code == 201
    assert elapsed < 0.5, f"Endpoint took {elapsed:.2f}s, expected < 0.5s"
