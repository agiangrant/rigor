package todo

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound   = errors.New("todo not found")
	ErrValidation = errors.New("validation error")
)

type Todo struct {
	ID          string
	Title       string
	Description string
	Done        bool
	UserID      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateInput struct {
	Title       string
	Description string
	UserID      string
}

type UpdateInput struct {
	Title       *string
	Description *string
	Done        *bool
}

type Store interface {
	FindByID(id string) (*Todo, error)
	FindByUserID(userID string) ([]*Todo, error)
	Create(t *Todo) error
	Update(t *Todo) error
	Delete(id string) error
}

type Service struct {
	store Store
}

func NewService(s Store) *Service {
	return &Service{store: s}
}

func (s *Service) GetByID(id string) (*Todo, error) {
	t, err := s.store.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("getting todo %s: %w", id, err)
	}
	if t == nil {
		return nil, ErrNotFound
	}
	return t, nil
}

func (s *Service) ListByUser(userID string) ([]*Todo, error) {
	todos, err := s.store.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("listing todos for user %s: %w", userID, err)
	}
	return todos, nil
}

func (s *Service) Create(input CreateInput) (*Todo, error) {
	if input.Title == "" {
		return nil, fmt.Errorf("%w: title is required", ErrValidation)
	}
	if input.UserID == "" {
		return nil, fmt.Errorf("%w: user ID is required", ErrValidation)
	}

	now := time.Now()
	t := &Todo{
		ID:          fmt.Sprintf("todo_%d", now.UnixNano()),
		Title:       input.Title,
		Description: input.Description,
		UserID:      input.UserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.Create(t); err != nil {
		return nil, fmt.Errorf("creating todo: %w", err)
	}

	return t, nil
}

func (s *Service) Update(id string, input UpdateInput) (*Todo, error) {
	t, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Title != nil {
		t.Title = *input.Title
	}
	if input.Description != nil {
		t.Description = *input.Description
	}
	if input.Done != nil {
		t.Done = *input.Done
	}
	t.UpdatedAt = time.Now()

	if err := s.store.Update(t); err != nil {
		return nil, fmt.Errorf("updating todo %s: %w", id, err)
	}

	return t, nil
}

func (s *Service) Delete(id string) error {
	if _, err := s.GetByID(id); err != nil {
		return err
	}
	if err := s.store.Delete(id); err != nil {
		return fmt.Errorf("deleting todo %s: %w", id, err)
	}
	return nil
}
