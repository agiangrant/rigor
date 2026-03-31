use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<User>, AppError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError>;
    async fn find_all(&self) -> Result<Vec<User>, AppError>;
    async fn create(&self, user: &User) -> Result<(), AppError>;
}

pub struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub async fn get_by_id(&self, id: &str) -> Result<User, AppError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                resource: "User".to_string(),
                id: id.to_string(),
            })
    }

    pub async fn create(&self, input: CreateUserInput) -> Result<User, AppError> {
        if input.email.is_empty() {
            return Err(AppError::Validation("email is required".to_string()));
        }
        if input.name.is_empty() {
            return Err(AppError::Validation("name is required".to_string()));
        }

        if let Some(_) = self.repo.find_by_email(&input.email).await? {
            return Err(AppError::Conflict(format!(
                "email already in use: {}",
                input.email
            )));
        }

        let user = User {
            id: Uuid::new_v4().to_string(),
            email: input.email,
            name: input.name,
            created_at: Utc::now(),
        };

        self.repo.create(&user).await?;
        Ok(user)
    }

    pub async fn list_all(&self) -> Result<Vec<User>, AppError> {
        self.repo.find_all().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockUserRepo {
        find_by_id_fn: Box<dyn Fn(&str) -> Result<Option<User>, AppError> + Send + Sync>,
        find_by_email_fn: Box<dyn Fn(&str) -> Result<Option<User>, AppError> + Send + Sync>,
        find_all_fn: Box<dyn Fn() -> Result<Vec<User>, AppError> + Send + Sync>,
        create_fn: Box<dyn Fn(&User) -> Result<(), AppError> + Send + Sync>,
    }

    #[async_trait]
    impl UserRepository for MockUserRepo {
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

    fn make_user(id: &str, email: &str) -> User {
        User {
            id: id.to_string(),
            email: email.to_string(),
            name: "Test".to_string(),
            created_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn test_get_by_id_returns_user() {
        let repo = MockUserRepo {
            find_by_id_fn: Box::new(|_| Ok(Some(make_user("1", "a@b.com")))),
            find_by_email_fn: Box::new(|_| Ok(None)),
            find_all_fn: Box::new(|| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
        };
        let svc = UserService::new(repo);
        let user = svc.get_by_id("1").await.unwrap();
        assert_eq!(user.email, "a@b.com");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let repo = MockUserRepo {
            find_by_id_fn: Box::new(|_| Ok(None)),
            find_by_email_fn: Box::new(|_| Ok(None)),
            find_all_fn: Box::new(|| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
        };
        let svc = UserService::new(repo);
        let err = svc.get_by_id("999").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound { .. }));
    }

    #[tokio::test]
    async fn test_create_user_success() {
        let repo = MockUserRepo {
            find_by_id_fn: Box::new(|_| Ok(None)),
            find_by_email_fn: Box::new(|_| Ok(None)),
            find_all_fn: Box::new(|| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
        };
        let svc = UserService::new(repo);
        let user = svc
            .create(CreateUserInput {
                email: "a@b.com".to_string(),
                name: "Alice".to_string(),
            })
            .await
            .unwrap();
        assert_eq!(user.email, "a@b.com");
    }

    #[tokio::test]
    async fn test_create_user_duplicate_email() {
        let repo = MockUserRepo {
            find_by_id_fn: Box::new(|_| Ok(None)),
            find_by_email_fn: Box::new(|_| Ok(Some(make_user("1", "a@b.com")))),
            find_all_fn: Box::new(|| Ok(vec![])),
            create_fn: Box::new(|_| Ok(())),
        };
        let svc = UserService::new(repo);
        let err = svc
            .create(CreateUserInput {
                email: "a@b.com".to_string(),
                name: "Alice".to_string(),
            })
            .await
            .unwrap_err();
        assert!(matches!(err, AppError::Conflict(_)));
    }
}
