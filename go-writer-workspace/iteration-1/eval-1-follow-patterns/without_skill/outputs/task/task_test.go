package task

import (
	"errors"
	"testing"
)

type mockStore struct {
	findByID      func(id string) (*Task, error)
	findByProject func(projectID string) ([]*Task, error)
	create        func(t *Task) error
	update        func(t *Task) error
}

func (m *mockStore) FindByID(id string) (*Task, error)                { return m.findByID(id) }
func (m *mockStore) FindByProject(projectID string) ([]*Task, error)  { return m.findByProject(projectID) }
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
			Title:      "Fix bug",
			ProjectID:  "proj_1",
			AssigneeID: "usr_1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "Fix bug" {
			t.Errorf("got title %q, want %q", tk.Title, "Fix bug")
		}
		if tk.Status != StatusOpen {
			t.Errorf("got status %q, want %q", tk.Status, StatusOpen)
		}
		if tk.ProjectID != "proj_1" {
			t.Errorf("got project id %q, want %q", tk.ProjectID, "proj_1")
		}
		if created == nil {
			t.Fatal("task was not passed to store.Create")
		}
	})

	t.Run("returns ErrInvalidTitle for empty title", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.Create(CreateInput{Title: "", ProjectID: "proj_1"})
		if !errors.Is(err, ErrInvalidTitle) {
			t.Errorf("got error %v, want ErrInvalidTitle", err)
		}
	})

	t.Run("returns ErrInvalidProject for empty project id", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.Create(CreateInput{Title: "Fix bug", ProjectID: ""})
		if !errors.Is(err, ErrInvalidProject) {
			t.Errorf("got error %v, want ErrInvalidProject", err)
		}
	})
}

func TestService_GetByID(t *testing.T) {
	t.Run("returns task when found", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "tsk_1", Title: "Fix bug"}, nil
			},
		})

		tk, err := svc.GetByID("tsk_1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "Fix bug" {
			t.Errorf("got title %q, want %q", tk.Title, "Fix bug")
		}
	})

	t.Run("returns ErrNotFound when task does not exist", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return nil, nil
			},
		})

		_, err := svc.GetByID("tsk_999")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}

func TestService_ListByProject(t *testing.T) {
	t.Run("returns tasks for project", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByProject: func(projectID string) ([]*Task, error) {
				return []*Task{
					{ID: "tsk_1", ProjectID: "proj_1"},
					{ID: "tsk_2", ProjectID: "proj_1"},
				}, nil
			},
		})

		tasks, err := svc.ListByProject("proj_1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(tasks) != 2 {
			t.Errorf("got %d tasks, want 2", len(tasks))
		}
	})

	t.Run("returns empty slice when no tasks", func(t *testing.T) {
		svc := NewService(&mockStore{
			findByProject: func(projectID string) ([]*Task, error) {
				return []*Task{}, nil
			},
		})

		tasks, err := svc.ListByProject("proj_1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(tasks) != 0 {
			t.Errorf("got %d tasks, want 0", len(tasks))
		}
	})
}

func TestService_Update(t *testing.T) {
	t.Run("updates task fields", func(t *testing.T) {
		newTitle := "Updated title"
		var updated *Task
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "tsk_1", Title: "Old title", Status: StatusOpen}, nil
			},
			update: func(t *Task) error {
				updated = t
				return nil
			},
		})

		tk, err := svc.Update("tsk_1", UpdateInput{Title: &newTitle})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Title != "Updated title" {
			t.Errorf("got title %q, want %q", tk.Title, "Updated title")
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

		newTitle := "Updated"
		_, err := svc.Update("tsk_999", UpdateInput{Title: &newTitle})
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})

	t.Run("returns ErrInvalidTitle for empty title", func(t *testing.T) {
		emptyTitle := ""
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "tsk_1", Title: "Old title"}, nil
			},
		})

		_, err := svc.Update("tsk_1", UpdateInput{Title: &emptyTitle})
		if !errors.Is(err, ErrInvalidTitle) {
			t.Errorf("got error %v, want ErrInvalidTitle", err)
		}
	})
}

func TestService_ChangeStatus(t *testing.T) {
	t.Run("changes status to done", func(t *testing.T) {
		var updated *Task
		svc := NewService(&mockStore{
			findByID: func(id string) (*Task, error) {
				return &Task{ID: "tsk_1", Status: StatusOpen}, nil
			},
			update: func(t *Task) error {
				updated = t
				return nil
			},
		})

		tk, err := svc.ChangeStatus("tsk_1", StatusDone)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tk.Status != StatusDone {
			t.Errorf("got status %q, want %q", tk.Status, StatusDone)
		}
		if updated == nil {
			t.Fatal("task was not passed to store.Update")
		}
	})

	t.Run("returns ErrInvalidStatus for unknown status", func(t *testing.T) {
		svc := NewService(&mockStore{})

		_, err := svc.ChangeStatus("tsk_1", "invalid")
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

		_, err := svc.ChangeStatus("tsk_999", StatusDone)
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("got error %v, want ErrNotFound", err)
		}
	})
}
