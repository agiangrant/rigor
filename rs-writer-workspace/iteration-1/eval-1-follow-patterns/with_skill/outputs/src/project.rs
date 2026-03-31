use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProjectStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner_id: String,
    pub status: ProjectStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: String,
    pub owner_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Project>, AppError>;
    async fn find_by_owner(&self, owner_id: &str) -> Result<Vec<Project>, AppError>;
    async fn create(&self, project: &Project) -> Result<(), AppError>;
    async fn update(&self, project: &Project) -> Result<(), AppError>;
}

pub struct ProjectService<R: ProjectRepository> {
    repo: R,
}

impl<R: ProjectRepository> ProjectService<R> {
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub async fn create(&self, input: CreateProjectInput) -> Result<Project, AppError> {
        if input.name.is_empty() {
            return Err(AppError::Validation("name is required".to_string()));
        }
        if input.description.is_empty() {
            return Err(AppError::Validation("description is required".to_string()));
        }

        let project = Project {
            id: Uuid::new_v4().to_string(),
            name: input.name,
            description: input.description,
            owner_id: input.owner_id,
            status: ProjectStatus::Active,
            created_at: Utc::now(),
        };

        self.repo.create(&project).await?;
        Ok(project)
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Project, AppError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                resource: "Project".to_string(),
                id: id.to_string(),
            })
    }

    pub async fn list_by_owner(&self, owner_id: &str) -> Result<Vec<Project>, AppError> {
        self.repo.find_by_owner(owner_id).await
    }

    pub async fn update(
        &self,
        id: &str,
        input: UpdateProjectInput,
    ) -> Result<Project, AppError> {
        let mut project = self.get_by_id(id).await?;

        if let Some(name) = input.name {
            project.name = name;
        }
        if let Some(description) = input.description {
            project.description = description;
        }

        self.repo.update(&project).await?;
        Ok(project)
    }

    pub async fn archive(&self, id: &str) -> Result<Project, AppError> {
        let mut project = self.get_by_id(id).await?;
        project.status = ProjectStatus::Archived;
        self.repo.update(&project).await?;
        Ok(project)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockProjectRepo {
        find_by_id_fn: Box<dyn Fn(&str) -> Result<Option<Project>, AppError> + Send + Sync>,
        find_by_owner_fn: Box<dyn Fn(&str) -> Result<Vec<Project>, AppError> + Send + Sync>,
        create_fn: Box<dyn Fn(&Project) -> Result<(), AppError> + Send + Sync>,
        update_fn: Box<dyn Fn(&Project) -> Result<(), AppError> + Send + Sync>,
    }

    #[async_trait]
    impl ProjectRepository for MockProjectRepo {
        async fn find_by_id(&self, id: &str) -> Result<Option<Project>, AppError> {
            (self.find_by_id_fn)(id)
        }
        async fn find_by_owner(&self, owner_id: &str) -> Result<Vec<Project>, AppError> {
            (self.find_by_owner_fn)(owner_id)
        }
        async fn create(&self, project: &Project) -> Result<(), AppError> {
            (self.create_fn)(project)
        }
        async fn update(&self, project: &Project) -> Result<(), AppError> {
            (self.update_fn)(project)
        }
    }

    fn make_project(id: &str, owner_id: &str) -> Project {
        Project {
            id: id.to_string(),
            name: "Test Project".to_string(),
            description: "A test project".to_string(),
            owner_id: owner_id.to_string(),
            status: ProjectStatus::Active,
            created_at: Utc::now(),
        }
    }

    fn default_mock() -> MockProjectRepo {
        MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(None)),
            find_by_owner_fn: Box::new(|_| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
            update_fn: Box::new(|_| Ok(())),
        }
    }

    #[tokio::test]
    async fn test_create_project_success() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let project = svc
            .create(CreateProjectInput {
                name: "My Project".to_string(),
                description: "Does things".to_string(),
                owner_id: "user-1".to_string(),
            })
            .await
            .unwrap();
        assert_eq!(project.name, "My Project");
        assert_eq!(project.description, "Does things");
        assert_eq!(project.owner_id, "user-1");
        assert_eq!(project.status, ProjectStatus::Active);
        assert!(!project.id.is_empty());
    }

    #[tokio::test]
    async fn test_create_project_empty_name_returns_validation_error() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let err = svc
            .create(CreateProjectInput {
                name: "".to_string(),
                description: "Does things".to_string(),
                owner_id: "user-1".to_string(),
            })
            .await
            .unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn test_create_project_empty_description_returns_validation_error() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let err = svc
            .create(CreateProjectInput {
                name: "My Project".to_string(),
                description: "".to_string(),
                owner_id: "user-1".to_string(),
            })
            .await
            .unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn test_get_by_id_returns_project() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_mock()
        };
        let svc = ProjectService::new(repo);
        let project = svc.get_by_id("p-1").await.unwrap();
        assert_eq!(project.id, "p-1");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let err = svc.get_by_id("nonexistent").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }

    #[tokio::test]
    async fn test_list_by_owner_returns_projects() {
        let repo = MockProjectRepo {
            find_by_owner_fn: Box::new(|_| {
                Ok(vec![make_project("p-1", "user-1"), make_project("p-2", "user-1")])
            }),
            ..default_mock()
        };
        let svc = ProjectService::new(repo);
        let projects = svc.list_by_owner("user-1").await.unwrap();
        assert_eq!(projects.len(), 2);
    }

    #[tokio::test]
    async fn test_list_by_owner_returns_empty_when_none() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let projects = svc.list_by_owner("user-1").await.unwrap();
        assert!(projects.is_empty());
    }

    #[tokio::test]
    async fn test_update_project_success() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_mock()
        };
        let svc = ProjectService::new(repo);
        let project = svc
            .update(
                "p-1",
                UpdateProjectInput {
                    name: Some("Updated Name".to_string()),
                    description: Some("Updated Desc".to_string()),
                },
            )
            .await
            .unwrap();
        assert_eq!(project.name, "Updated Name");
        assert_eq!(project.description, "Updated Desc");
    }

    #[tokio::test]
    async fn test_update_project_not_found() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let err = svc
            .update(
                "nonexistent",
                UpdateProjectInput {
                    name: Some("X".to_string()),
                    description: None,
                },
            )
            .await
            .unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }

    #[tokio::test]
    async fn test_archive_project_success() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_mock()
        };
        let svc = ProjectService::new(repo);
        let project = svc.archive("p-1").await.unwrap();
        assert_eq!(project.status, ProjectStatus::Archived);
    }

    #[tokio::test]
    async fn test_archive_project_not_found() {
        let repo = default_mock();
        let svc = ProjectService::new(repo);
        let err = svc.archive("nonexistent").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }
}
