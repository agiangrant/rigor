import pytest
from rest_framework.test import APIClient
from myapp.models.user import User
from myapp.models.project import Project
from myapp.models.task import Task


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create(email="alice@example.com", name="Alice")


@pytest.fixture
def project(user):
    return Project.objects.create(name="My Project", owner=user)


@pytest.fixture
def task(user, project):
    return Task.objects.create(
        title="Fix bug",
        description="There is a bug in the login flow",
        status="todo",
        assigned_to=user,
        project=project,
    )


@pytest.mark.django_db
class TestTaskListView:
    def test_list_tasks_empty(self, client):
        response = client.get("/api/tasks/")
        assert response.status_code == 200
        assert response.data == []

    def test_list_tasks(self, client, task):
        response = client.get("/api/tasks/")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["title"] == "Fix bug"

    def test_create_task(self, client, user, project):
        response = client.post(
            "/api/tasks/",
            {
                "title": "New task",
                "description": "A new task",
                "status": "todo",
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 201
        assert response.data["title"] == "New task"
        assert response.data["status"] == "todo"
        assert response.data["assigned_to"] == user.pk
        assert response.data["project"] == project.pk

    def test_create_task_default_status(self, client, user, project):
        response = client.post(
            "/api/tasks/",
            {
                "title": "Defaults to todo",
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 201
        assert response.data["status"] == "todo"

    def test_create_task_invalid_status(self, client, user, project):
        response = client.post(
            "/api/tasks/",
            {
                "title": "Bad status",
                "status": "invalid",
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 400

    def test_create_task_missing_title(self, client, user, project):
        response = client.post(
            "/api/tasks/",
            {
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 400

    def test_create_task_missing_assigned_to(self, client, project):
        response = client.post(
            "/api/tasks/",
            {
                "title": "No assignee",
                "project": project.pk,
            },
        )
        assert response.status_code == 400

    def test_create_task_missing_project(self, client, user):
        response = client.post(
            "/api/tasks/",
            {
                "title": "No project",
                "assigned_to": user.pk,
            },
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestTaskDetailView:
    def test_get_task(self, client, task):
        response = client.get(f"/api/tasks/{task.pk}/")
        assert response.status_code == 200
        assert response.data["title"] == "Fix bug"
        assert response.data["description"] == "There is a bug in the login flow"
        assert response.data["status"] == "todo"

    def test_get_task_not_found(self, client):
        response = client.get("/api/tasks/999/")
        assert response.status_code == 404
        assert response.data["error"] == "Task not found"

    def test_update_task_put(self, client, task, user, project):
        response = client.put(
            f"/api/tasks/{task.pk}/",
            {
                "title": "Updated title",
                "description": "Updated description",
                "status": "in_progress",
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 200
        assert response.data["title"] == "Updated title"
        assert response.data["status"] == "in_progress"

    def test_update_task_patch(self, client, task):
        response = client.patch(
            f"/api/tasks/{task.pk}/",
            {"status": "done"},
        )
        assert response.status_code == 200
        assert response.data["status"] == "done"
        assert response.data["title"] == "Fix bug"

    def test_update_task_not_found(self, client, user, project):
        response = client.put(
            "/api/tasks/999/",
            {
                "title": "Nope",
                "status": "todo",
                "assigned_to": user.pk,
                "project": project.pk,
            },
        )
        assert response.status_code == 404

    def test_delete_task(self, client, task):
        response = client.delete(f"/api/tasks/{task.pk}/")
        assert response.status_code == 204
        assert Task.objects.filter(pk=task.pk).count() == 0

    def test_delete_task_not_found(self, client):
        response = client.delete("/api/tasks/999/")
        assert response.status_code == 404

    def test_task_has_timestamps(self, client, task):
        response = client.get(f"/api/tasks/{task.pk}/")
        assert response.status_code == 200
        assert "created_at" in response.data
        assert "updated_at" in response.data
