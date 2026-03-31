use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {resource} {id}")]
    NotFound { resource: String, id: String },

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("validation: {0}")]
    Validation(String),

    #[error("internal: {0}")]
    Internal(String),
}
