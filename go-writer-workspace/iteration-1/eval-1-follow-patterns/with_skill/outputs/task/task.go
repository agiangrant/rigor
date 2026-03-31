package task

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound       = errors.New("task not found")
	ErrInvalidTitle   = errors.New("invalid title")
	ErrInvalidStatus  = errors.New("invalid status")
	ErrInvalidProject = errors.New("invalid project")
)

type Status string

const (
	StatusOpen       Status = "open"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
)

func validStatus(s Status) bool {
	switch s {
	case StatusOpen, StatusInProgress, StatusDone:
		return true
	}
	return false
}

type Task struct {
	ID          string
	Title       string
	Description string
	Status      Status
	AssigneeID  string
	ProjectID   string
	CreatedAt   time.Time
}

type CreateInput struct {
	Title       string
	Description string
	AssigneeID  string
	ProjectID   string
}

type UpdateInput struct {
	Title       *string
	Description *string
	AssigneeID  *string
}

type Store interface {
	FindByID(id string) (*Task, error)
	FindByProjectID(projectID string) ([]*Task, error)
	Create(t *Task) error
	Update(t *Task) error
}

type Service struct {
	store Store
}

func NewService(s Store) *Service {
	return &Service{store: s}
}

func (s *Service) Create(input CreateInput) (*Task, error) {
	if input.Title == "" {
		return nil, ErrInvalidTitle
	}
	if input.ProjectID == "" {
		return nil, ErrInvalidProject
	}

	t := &Task{
		ID:          generateID(),
		Title:       input.Title,
		Description: input.Description,
		Status:      StatusOpen,
		AssigneeID:  input.AssigneeID,
		ProjectID:   input.ProjectID,
		CreatedAt:   time.Now(),
	}

	if err := s.store.Create(t); err != nil {
		return nil, fmt.Errorf("creating task: %w", err)
	}

	return t, nil
}

func (s *Service) GetByID(id string) (*Task, error) {
	t, err := s.store.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("getting task %s: %w", id, err)
	}
	if t == nil {
		return nil, ErrNotFound
	}
	return t, nil
}

func (s *Service) ListByProject(projectID string) ([]*Task, error) {
	if projectID == "" {
		return nil, ErrInvalidProject
	}

	tasks, err := s.store.FindByProjectID(projectID)
	if err != nil {
		return nil, fmt.Errorf("listing tasks for project %s: %w", projectID, err)
	}
	return tasks, nil
}

func (s *Service) Update(id string, input UpdateInput) (*Task, error) {
	t, err := s.store.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("finding task %s: %w", id, err)
	}
	if t == nil {
		return nil, ErrNotFound
	}

	if input.Title != nil {
		t.Title = *input.Title
	}
	if input.Description != nil {
		t.Description = *input.Description
	}
	if input.AssigneeID != nil {
		t.AssigneeID = *input.AssigneeID
	}

	if err := s.store.Update(t); err != nil {
		return nil, fmt.Errorf("updating task %s: %w", id, err)
	}

	return t, nil
}

func (s *Service) ChangeStatus(id string, status Status) (*Task, error) {
	if !validStatus(status) {
		return nil, ErrInvalidStatus
	}

	t, err := s.store.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("finding task %s: %w", id, err)
	}
	if t == nil {
		return nil, ErrNotFound
	}

	t.Status = status

	if err := s.store.Update(t); err != nil {
		return nil, fmt.Errorf("changing task %s status: %w", id, err)
	}

	return t, nil
}

func generateID() string {
	return fmt.Sprintf("tsk_%d", time.Now().UnixNano())
}
