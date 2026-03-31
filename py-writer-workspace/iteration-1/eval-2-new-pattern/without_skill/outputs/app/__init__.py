import os

from flask import Flask
from redis import Redis
from rq import Queue


def create_app():
    app = Flask(__name__)

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    app.config["RQ_REDIS"] = Redis.from_url(redis_url)
    app.config["RQ_QUEUE"] = Queue(connection=app.config["RQ_REDIS"])

    from app.routes import bp

    app.register_blueprint(bp)
    return app
