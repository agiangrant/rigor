use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::user::UserRepository;

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
    pub updated_at: DateTime<Utc>,
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
    async fn find_by_owner_id(&self, owner_id: &str) -> Result<Vec<Project>, AppError>;
    async fn create(&self, project: &Project) -> Result<(), AppError>;
    async fn update(&self, project: &Project) -> Result<(), AppError>;
}

pub struct ProjectService<R: ProjectRepository, U: UserRepository> {
    repo: R,
    user_repo: U,
}

impl<R: ProjectRepository, U: UserRepository> ProjectService<R, U> {
    pub fn new(repo: R, user_repo: U) -> Self {
        Self { repo, user_repo }
    }

    pub async fn create(&self, input: CreateProjectInput) -> Result<Project, AppError> {
        if input.name.is_empty() {
            return Err(AppError::Validation("name is required".to_string()));
        }
        if input.description.is_empty() {
            return Err(AppError::Validation("description is required".to_string()));
        }
        if input.owner_id.is_empty() {
            return Err(AppError::Validation("owner_id is required".to_string()));
        }

        self.user_repo
            .find_by_id(&input.owner_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                resource: "User".to_string(),
                id: input.owner_id.clone(),
            })?;

        let now = Utc::now();
        let project = Project {
            id: Uuid::new_v4().to_string(),
            name: input.name,
            description: input.description,
            owner_id: input.owner_id,
            status: ProjectStatus::Active,
            created_at: now,
            updated_at: now,
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
        self.repo.find_by_owner_id(owner_id).await
    }

    pub async fn update(&self, id: &str, input: UpdateProjectInput) -> Result<Project, AppError> {
        if input.name.is_none() && input.description.is_none() {
            return Err(AppError::Validation(
                "at least one field must be provided".to_string(),
            ));
        }

        let mut project = self.get_by_id(id).await?;

        if let Some(name) = input.name {
            if name.is_empty() {
                return Err(AppError::Validation("name cannot be empty".to_string()));
            }
            project.name = name;
        }
        if let Some(description) = input.description {
            project.description = description;
        }

        project.updated_at = Utc::now();
        self.repo.update(&project).await?;
        Ok(project)
    }

    pub async fn archive(&self, id: &str) -> Result<Project, AppError> {
        let mut project = self.get_by_id(id).await?;
        project.status = ProjectStatus::Archived;
        project.updated_at = Utc::now();
        self.repo.update(&project).await?;
        Ok(project)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::User;

    struct MockProjectRepo {
        find_by_id_fn: Box<dyn Fn(&str) -> Result<Option<Project>, AppError> + Send + Sync>,
        find_by_owner_id_fn: Box<dyn Fn(&str) -> Result<Vec<Project>, AppError> + Send + Sync>,
        create_fn: Box<dyn Fn(&Project) -> Result<(), AppError> + Send + Sync>,
        update_fn: Box<dyn Fn(&Project) -> Result<(), AppError> + Send + Sync>,
    }

    #[async_trait]
    impl ProjectRepository for MockProjectRepo {
        async fn find_by_id(&self, id: &str) -> Result<Option<Project>, AppError> {
            (self.find_by_id_fn)(id)
        }
        async fn find_by_owner_id(&self, owner_id: &str) -> Result<Vec<Project>, AppError> {
            (self.find_by_owner_id_fn)(owner_id)
        }
        async fn create(&self, project: &Project) -> Result<(), AppError> {
            (self.create_fn)(project)
        }
        async fn update(&self, project: &Project) -> Result<(), AppError> {
            (self.update_fn)(project)
        }
    }

    struct MockUserRepo {
        find_by_id_fn: Box<dyn Fn(&str) -> Result<Option<User>, AppError> + Send + Sync>,
        find_by_email_fn: Box<dyn Fn(&str) -> Result<Option<User>, AppError> + Send + Sync>,
        find_all_fn: Box<dyn Fn() -> Result<Vec<User>, AppError> + Send + Sync>,
        create_fn: Box<dyn Fn(&User) -> Result<(), AppError> + Send + Sync>,
    }

    #[async_trait]
    impl crate::user::UserRepository for MockUserRepo {
        async fn find_by_id(&self, id: &str) -> Result<Option<User>, AppError> {
            (self.find_by_id_fn)(id)
        }
        async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError> {
            (self.find_by_email_fn)(email)
        }
        async fn find_all(&self) -> Result<Vec<User>, AppError> {
            (self.find_all_fn)()
        }
        async fn create(&self, user: &User) -> Result<(), AppError> {
            (self.create_fn)(user)
        }
    }

    fn make_user(id: &str) -> User {
        User {
            id: id.to_string(),
            email: "owner@test.com".to_string(),
            name: "Owner".to_string(),
            created_at: Utc::now(),
        }
    }

    fn make_project(id: &str, owner_id: &str) -> Project {
        let now = Utc::now();
        Project {
            id: id.to_string(),
            name: "Test Project".to_string(),
            description: "A test project".to_string(),
            owner_id: owner_id.to_string(),
            status: ProjectStatus::Active,
            created_at: now,
            updated_at: now,
        }
    }

    fn default_user_repo(user_exists: bool) -> MockUserRepo {
        MockUserRepo {
            find_by_id_fn: Box::new(move |id| {
                if user_exists {
                    Ok(Some(make_user(id)))
                } else {
                    Ok(None)
                }
            }),
            find_by_email_fn: Box::new(|_| Ok(None)),
            find_all_fn: Box::new(|| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
        }
    }

    fn default_project_repo() -> MockProjectRepo {
        MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(None)),
            find_by_owner_id_fn: Box::new(|_| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
            update_fn: Box::new(|_| Ok(())),
        }
    }

    #[tokio::test]
    async fn test_create_project_success() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let project = svc
            .create(CreateProjectInput {
                name: "My Project".to_string(),
                description: "A great project".to_string(),
                owner_id: "user-1".to_string(),
            })
            .await
            .unwrap();

        assert_eq!(project.name, "My Project");
        assert_eq!(project.description, "A great project");
        assert_eq!(project.owner_id, "user-1");
        assert_eq!(project.status, ProjectStatus::Active);
    }

    #[tokio::test]
    async fn test_create_project_empty_name() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc
            .create(CreateProjectInput {
                name: "".to_string(),
                description: "desc".to_string(),
                owner_id: "user-1".to_string(),
            })
            .await
            .unwrap_err();

        assert!(matches!(err, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn test_create_project_nonexistent_owner() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(false);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc
            .create(CreateProjectInput {
                name: "My Project".to_string(),
                description: "desc".to_string(),
                owner_id: "no-such-user".to_string(),
            })
            .await
            .unwrap_err();

        assert!(matches!(err, AppError::NotFound { .. }));
    }

    #[tokio::test]
    async fn test_get_by_id_returns_project() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_project_repo()
        };
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let project = svc.get_by_id("p-1").await.unwrap();
        assert_eq!(project.id, "p-1");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc.get_by_id("no-such-project").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }

    #[tokio::test]
    async fn test_list_by_owner() {
        let repo = MockProjectRepo {
            find_by_owner_id_fn: Box::new(|_| {
                Ok(vec![
                    make_project("p-1", "user-1"),
                    make_project("p-2", "user-1"),
                ])
            }),
            ..default_project_repo()
        };
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let projects = svc.list_by_owner("user-1").await.unwrap();
        assert_eq!(projects.len(), 2);
    }

    #[tokio::test]
    async fn test_list_by_owner_empty() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let projects = svc.list_by_owner("user-1").await.unwrap();
        assert!(projects.is_empty());
    }

    #[tokio::test]
    async fn test_update_project_success() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_project_repo()
        };
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let project = svc
            .update(
                "p-1",
                UpdateProjectInput {
                    name: Some("Updated Name".to_string()),
                    description: None,
                },
            )
            .await
            .unwrap();

        assert_eq!(project.name, "Updated Name");
        assert_eq!(project.description, "A test project");
    }

    #[tokio::test]
    async fn test_update_project_no_fields() {
        let repo = MockProjectRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_project("p-1", "user-1")))),
            ..default_project_repo()
        };
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc
            .update(
                "p-1",
                UpdateProjectInput {
                    name: None,
                    description: None,
                },
            )
            .await
            .unwrap_err();

        assert!(matches!(err, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn test_update_project_not_found() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc
            .update(
                "no-such-project",
                UpdateProjectInput {
                    name: Some("New".to_string()),
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
            ..default_project_repo()
        };
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let project = svc.archive("p-1").await.unwrap();
        assert_eq!(project.status, ProjectStatus::Archived);
    }

    #[tokio::test]
    async fn test_archive_project_not_found() {
        let repo = default_project_repo();
        let user_repo = default_user_repo(true);
        let svc = ProjectService::new(repo, user_repo);

        let err = svc.archive("no-such-project").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }
}
