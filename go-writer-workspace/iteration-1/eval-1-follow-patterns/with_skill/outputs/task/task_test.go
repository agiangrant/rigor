package task

import (
	"errors"
	"testing"
)

type mockStore struct {
	findByID        func(id string) (*Task, error)
	findByProjectID func(projectID string) ([]*Task, error)
	create          func(t *Task) error
	update          func(t *Task) error
}

func (m *mockStore) FindByID(id string) (*Task, error)                { return m.findByID(id) }
func (m *mockStore) FindByProjectID(projectID string) ([]*Task, error) { return m.findByProjectID(projectID) }
func (m *mockStore) Create(t *Task) error                             { return m.create(t) }
func (m *mockStore) Update(t *Task) error                             { return m.update(t) }

func TestService_Create(t *testing.T) {
	t.Run("creates task with valid input", func(t *testing.T) {
		var created *Task
		svc := NewService(&mockStore{
			create: func(t *Task) error {
				created = t
				return nil
			},
		})

		tk, err := svc.Create(CreateInput{
			Title:       "Write tests",
			Description: "Write unit tests for task service",
			AssigneeID:  "usr_1",
			ProjectID:   "prj_1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "Write tests" {
			t.Errorf("got title %q, want %q", tk.Title, "Write tests")
		}
		if tk.Status != StatusOpen {
			t.Errorf("got status %q, want %q", tk.Status, StatusOpen)
		}
		if tk.ProjectID != "prj_1" {
			t.Errorf("got projectID %q, want %q", tk.ProjectID, "prj_1")
		}
		if created == nil {
			t.Fatal("task was not passed to store.Create")
		}
	})

	t.Run("returns ErrInvalidTitle for empty title", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.Create(CreateInput{Title: "", ProjectID: "prj_1"})
		if !errors.Is(err, ErrInvalidTitle) {
			t.Errorf("got error %v, want ErrInvalidTitle", err)
		}
	})

	t.Run("returns ErrInvalidProject for empty projectId", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.Create(CreateInput{Title: "Do something", ProjectID: ""})
		if !errors.Is(err, ErrInvalidProject) {
			t.Errorf("got error %v, want ErrInvalidProject", err)
		}
	})
}

func TestService_GetByID(t *testing.T) {
	t.Run("returns task when found", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "1", Title: "Found task"}, nil
			},
		})

		tk, err := svc.GetByID("1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "Found task" {
			t.Errorf("got title %q, want %q", tk.Title, "Found task")
		}
	})

	t.Run("returns ErrNotFound when task does not exist", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return nil, nil
			},
		})

		_, err := svc.GetByID("999")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}

func TestService_ListByProject(t *testing.T) {
	t.Run("returns tasks for project", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByProjectID: func(projectID string) ([]*Task, error) {
				return []*Task{
					{ID: "1", ProjectID: "prj_1"},
					{ID: "2", ProjectID: "prj_1"},
				}, nil
			},
		})

		tasks, err := svc.ListByProject("prj_1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(tasks) != 2 {
			t.Errorf("got %d tasks, want 2", len(tasks))
		}
	})

	t.Run("returns ErrInvalidProject for empty project ID", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.ListByProject("")
		if !errors.Is(err, ErrInvalidProject) {
			t.Errorf("got error %v, want ErrInvalidProject", err)
		}
	})
}

func TestService_Update(t *testing.T) {
	t.Run("updates task fields", func(t *testing.T) {
		var updated *Task
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "1", Title: "Old", Description: "Old desc", AssigneeID: "usr_1", ProjectID: "prj_1", Status: StatusOpen}, nil
			},
			update: func(t *Task) error {
				updated = t
				return nil
			},
		})

		newTitle := "New"
		newDesc := "New desc"
		tk, err := svc.Update("1", UpdateInput{Title: &newTitle, Description: &newDesc})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "New" {
			t.Errorf("got title %q, want %q", tk.Title, "New")
		}
		if tk.Description != "New desc" {
			t.Errorf("got description %q, want %q", tk.Description, "New desc")
		}
		if updated == nil {
			t.Fatal("task was not passed to store.Update")
		}
	})

	t.Run("returns ErrNotFound when task does not exist", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return nil, nil
			},
		})

		_, err := svc.Update("999", UpdateInput{})
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}

func TestService_ChangeStatus(t *testing.T) {
	t.Run("changes status to valid value", func(t *testing.T) {
		var updated *Task
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "1", Status: StatusOpen}, nil
			},
			update: func(t *Task) error {
				updated = t
				return nil
			},
		})

		tk, err := svc.ChangeStatus("1", StatusInProgress)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Status != StatusInProgress {
			t.Errorf("got status %q, want %q", tk.Status, StatusInProgress)
		}
		if updated == nil {
			t.Fatal("task was not passed to store.Update")
		}
	})

	t.Run("returns ErrInvalidStatus for unknown status", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "1", Status: StatusOpen}, nil
			},
		})

		_, err := svc.ChangeStatus("1", Status("bogus"))
		if !errors.Is(err, ErrInvalidStatus) {
			t.Errorf("got error %v, want ErrInvalidStatus", err)
		}
	})

	t.Run("returns ErrNotFound when task does not exist", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return nil, nil
			},
		})

		_, err := svc.ChangeStatus("999", StatusDone)
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}
