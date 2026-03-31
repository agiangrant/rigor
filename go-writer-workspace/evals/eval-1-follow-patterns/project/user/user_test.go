package user

import (
	"errors"
	"testing"
)

type mockStore struct {
	findByID    func(id string) (*User, error)
	findByEmail func(email string) (*User, error)
	findAll     func() ([]*User, error)
	create      func(u *User) error
}

func (m *mockStore) FindByID(id string) (*User, error)       { return m.findByID(id) }
func (m *mockStore) FindByEmail(email string) (*User, error)  { return m.findByEmail(email) }
func (m *mockStore) FindAll() ([]*User, error)                { return m.findAll() }
func (m *mockStore) Create(u *User) error                     { return m.create(u) }

func TestService_GetByID(t *testing.T) {
	t.Run("returns user when found", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*User, error) {
				return &User{ID: "1", Email: "a@b.com"}, nil
			},
		})

		u, err := svc.GetByID("1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if u.Email != "a@b.com" {
			t.Errorf("got email %q, want %q", u.Email, "a@b.com")
		}
	})

	t.Run("returns ErrNotFound when user does not exist", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*User, error) {
				return nil, nil
			},
		})

		_, err := svc.GetByID("999")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}

func TestService_Create(t *testing.T) {
	t.Run("creates user with valid input", func(t *testing.T) {
		var created *User
		svc := NewService(&mockStore{
			findByEmail: func(email string) (*User, error) { return nil, nil },
			create: func(u *User) error {
				created = u
				return nil
			},
		})

		u, err := svc.Create(CreateInput{Email: "a@b.com", Name: "Alice"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if u.Email != "a@b.com" {
			t.Errorf("got email %q, want %q", u.Email, "a@b.com")
		}
		if created == nil {
			t.Fatal("user was not passed to store.Create")
		}
	})

	t.Run("returns ErrAlreadyExists for duplicate email", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByEmail: func(email string) (*User, error) {
				return &User{ID: "1"}, nil
			},
		})

		_, err := svc.Create(CreateInput{Email: "a@b.com", Name: "Alice"})
		if !errors.Is(err, ErrAlreadyExists) {
			t.Errorf("got error %v, want ErrAlreadyExists", err)
		}
	})

	t.Run("returns ErrInvalidEmail for empty email", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.Create(CreateInput{Email: "", Name: "Alice"})
		if !errors.Is(err, ErrInvalidEmail) {
			t.Errorf("got error %v, want ErrInvalidEmail", err)
		}
	})
}
