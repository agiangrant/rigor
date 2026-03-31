from flask import Blueprint, jsonify, request
from app.services import OrderService

bp = Blueprint("orders", __name__)
order_service = OrderService()


@bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    order = order_service.create(
        user_id=data["user_id"],
        items=data["items"],
    )
    # TODO: These block the response for 3+ seconds
    # Need to move to background processing
    order_service.send_confirmation_email(order)
    order_service.generate_invoice(order)
    order_service.notify_warehouse(order)
    return jsonify(order), 201
