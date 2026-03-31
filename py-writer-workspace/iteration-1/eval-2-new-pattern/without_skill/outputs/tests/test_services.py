from app.services import OrderService


def test_create_order():
    service = OrderService()
    order = service.create(user_id="u1", items=[{"product_id": "p1", "qty": 2}])
    assert order["id"] == "order-1"
    assert order["status"] == "pending"
