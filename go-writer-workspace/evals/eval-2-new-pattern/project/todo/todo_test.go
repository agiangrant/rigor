package todo

import (
	"errors"
	"testing"
)

type mockStore struct {
	findByID     func(id string) (*Todo, error)
	findByUserID func(userID string) ([]*Todo, error)
	create       func(t *Todo) error
	update       func(t *Todo) error
	delete       func(id string) error
}

func (m *mockStore) FindByID(id string) (*Todo, error)           { return m.findByID(id) }
func (m *mockStore) FindByUserID(userID string) ([]*Todo, error) { return m.findByUserID(userID) }
func (m *mockStore) Create(t *Todo) error                        { return m.create(t) }
func (m *mockStore) Update(t *Todo) error                        { return m.update(t) }
func (m *mockStore) Delete(id string) error                      { return m.delete(id) }

func TestService_Create(t *testing.T) {
	t.Run("creates todo with valid input", func(t *testing.T) {
		svc := NewService(&mockStore{
			create: func(t *Todo) error { return nil },
		})
		td, err := svc.Create(CreateInput{Title: "Buy milk", UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if td.Title != "Buy milk" {
			t.Errorf("got title %q, want %q", td.Title, "Buy milk")
		}
	})

	t.Run("rejects empty title", func(t *testing.T) {
		svc := NewService(&mockStore{})
		_, err := svc.Create(CreateInput{Title: "", UserID: "u1"})
		if !errors.Is(err, ErrValidation) {
			t.Errorf("got %v, want ErrValidation", err)
		}
	})
}
