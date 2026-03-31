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
        title="Write tests",
        description="Write tests for the task API",
        status="todo",
        assigned_to=user,
        project=project,
    )


@pytest.mark.django_db
class TestTaskModel:
    def test_create_task(self, user, project):
        task = Task.objects.create(
            title="Do something",
            description="A description",
            status="todo",
            assigned_to=user,
            project=project,
        )
        assert task.title == "Do something"
        assert task.status == "todo"
        assert task.assigned_to == user
        assert task.project == project
        assert task.created_at is not None
        assert task.updated_at is not None

    def test_status_choices(self, user, project):
        for status_value in ["todo", "in_progress", "done"]:
            task = Task.objects.create(
                title=f"Task {status_value}",
                description="",
                status=status_value,
                assigned_to=user,
                project=project,
            )
            assert task.status == status_value

    def test_default_status_is_todo(self, user, project):
        task = Task.objects.create(
            title="No status set",
            description="",
            assigned_to=user,
            project=project,
        )
        assert task.status == "todo"

    def test_cascade_delete_user(self, task):
        task.assigned_to.delete()
        assert not Task.objects.filter(pk=task.pk).exists()

    def test_cascade_delete_project(self, task):
        task.project.delete()
        assert not Task.objects.filter(pk=task.pk).exists()


@pytest.mark.django_db
class TestTaskListView:
    def test_list_tasks(self, client, task):
        response = client.get("/api/tasks/")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["title"] == "Write tests"

    def test_list_tasks_empty(self, client):
        response = client.get("/api/tasks/")
        assert response.status_code == 200
        assert len(response.data) == 0

    def test_create_task(self, client, user, project):
        response = client.post("/api/tasks/", {
            "title": "New task",
            "description": "A new task",
            "status": "todo",
            "assigned_to": user.pk,
            "project": project.pk,
        })
        assert response.status_code == 201
        assert response.data["title"] == "New task"
        assert response.data["status"] == "todo"
        assert response.data["assigned_to"] == user.pk
        assert response.data["project"] == project.pk

    def test_create_task_default_status(self, client, user, project):
        response = client.post("/api/tasks/", {
            "title": "No status",
            "description": "",
            "assigned_to": user.pk,
            "project": project.pk,
        })
        assert response.status_code == 201
        assert response.data["status"] == "todo"

    def test_create_task_invalid_status(self, client, user, project):
        response = client.post("/api/tasks/", {
            "title": "Bad status",
            "description": "",
            "status": "invalid",
            "assigned_to": user.pk,
            "project": project.pk,
        })
        assert response.status_code == 400

    def test_create_task_missing_title(self, client, user, project):
        response = client.post("/api/tasks/", {
            "description": "No title",
            "assigned_to": user.pk,
            "project": project.pk,
        })
        assert response.status_code == 400

    def test_create_task_missing_assigned_to(self, client, project):
        response = client.post("/api/tasks/", {
            "title": "No assignee",
            "description": "",
            "project": project.pk,
        })
        assert response.status_code == 400

    def test_create_task_missing_project(self, client, user):
        response = client.post("/api/tasks/", {
            "title": "No project",
            "description": "",
            "assigned_to": user.pk,
        })
        assert response.status_code == 400


@pytest.mark.django_db
class TestTaskDetailView:
    def test_get_task(self, client, task):
        response = client.get(f"/api/tasks/{task.pk}/")
        assert response.status_code == 200
        assert response.data["title"] == "Write tests"
        assert response.data["description"] == "Write tests for the task API"
        assert response.data["status"] == "todo"

    def test_get_task_not_found(self, client):
        response = client.get("/api/tasks/999/")
        assert response.status_code == 404
        assert response.data["error"] == "Task not found"

    def test_update_task(self, client, task):
        response = client.put(f"/api/tasks/{task.pk}/", {
            "title": "Updated title",
            "description": "Updated description",
            "status": "in_progress",
            "assigned_to": task.assigned_to.pk,
            "project": task.project.pk,
        })
        assert response.status_code == 200
        assert response.data["title"] == "Updated title"
        assert response.data["status"] == "in_progress"

    def test_update_task_partial(self, client, task):
        response = client.patch(f"/api/tasks/{task.pk}/", {
            "status": "done",
        })
        assert response.status_code == 200
        assert response.data["status"] == "done"
        assert response.data["title"] == "Write tests"

    def test_update_task_invalid_status(self, client, task):
        response = client.patch(f"/api/tasks/{task.pk}/", {
            "status": "invalid",
        })
        assert response.status_code == 400

    def test_update_task_not_found(self, client):
        response = client.put("/api/tasks/999/", {
            "title": "Nope",
            "description": "",
            "status": "todo",
            "assigned_to": 1,
            "project": 1,
        })
        assert response.status_code == 404

    def test_delete_task(self, client, task):
        response = client.delete(f"/api/tasks/{task.pk}/")
        assert response.status_code == 204
        assert not Task.objects.filter(pk=task.pk).exists()

    def test_delete_task_not_found(self, client):
        response = client.delete("/api/tasks/999/")
        assert response.status_code == 404
