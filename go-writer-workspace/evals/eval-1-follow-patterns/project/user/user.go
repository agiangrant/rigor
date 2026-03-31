package user

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound      = errors.New("user not found")
	ErrAlreadyExists = errors.New("user already exists")
	ErrInvalidEmail  = errors.New("invalid email")
)

type User struct {
	ID        string
	Email     string
	Name      string
	CreatedAt time.Time
}

type CreateInput struct {
	Email string
	Name  string
}

type Store interface {
	FindByID(id string) (*User, error)
	FindByEmail(email string) (*User, error)
	FindAll() ([]*User, error)
	Create(u *User) error
}

type Service struct {
	store Store
}

func NewService(s Store) *Service {
	return &Service{store: s}
}

func (s *Service) GetByID(id string) (*User, error) {
	u, err := s.store.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("getting user %s: %w", id, err)
	}
	if u == nil {
		return nil, ErrNotFound
	}
	return u, nil
}

func (s *Service) Create(input CreateInput) (*User, error) {
	if input.Email == "" {
		return nil, ErrInvalidEmail
	}

	existing, err := s.store.FindByEmail(input.Email)
	if err != nil {
		return nil, fmt.Errorf("checking existing user: %w", err)
	}
	if existing != nil {
		return nil, ErrAlreadyExists
	}

	u := &User{
		ID:        generateID(),
		Email:     input.Email,
		Name:      input.Name,
		CreatedAt: time.Now(),
	}

	if err := s.store.Create(u); err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}

	return u, nil
}

func generateID() string {
	return fmt.Sprintf("usr_%d", time.Now().UnixNano())
}
