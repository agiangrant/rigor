from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=200)
    owner = models.ForeignKey("User", on_delete=models.CASCADE, related_name="owned_projects")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "projects"
