import logging

from flask import Blueprint, current_app, jsonify, request

from app import tasks
from app.services import OrderService

logger = logging.getLogger(__name__)

bp = Blueprint("orders", __name__)
order_service = OrderService()


@bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    order = order_service.create(
        user_id=data["user_id"],
        items=data["items"],
    )

    queue = current_app.config["RQ_QUEUE"]
    try:
        queue.enqueue(tasks.send_confirmation_email, order)
        queue.enqueue(tasks.generate_invoice, order)
        queue.enqueue(tasks.notify_warehouse, order)
    except Exception:
        logger.exception("Failed to enqueue order side-effects for %s", order["id"])

    return jsonify(order), 201
