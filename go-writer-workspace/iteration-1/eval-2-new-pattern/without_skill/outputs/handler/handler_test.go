package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/example/todoapi/todo"
)

// --- mock store implementing todo.Store ---

type mockStore struct {
	findByID     func(id string) (*todo.Todo, error)
	findByUserID func(userID string) ([]*todo.Todo, error)
	create       func(t *todo.Todo) error
	update       func(t *todo.Todo) error
	delete       func(id string) error
}

func (m *mockStore) FindByID(id string) (*todo.Todo, error)           { return m.findByID(id) }
func (m *mockStore) FindByUserID(userID string) ([]*todo.Todo, error) { return m.findByUserID(userID) }
func (m *mockStore) Create(t *todo.Todo) error                        { return m.create(t) }
func (m *mockStore) Update(t *todo.Todo) error                        { return m.update(t) }
func (m *mockStore) Delete(id string) error                           { return m.delete(id) }

// --- helpers ---

func newTestHandler(store todo.Store) (*Handler, *http.ServeMux) {
	svc := todo.NewService(store)
	h := New(svc)
	mux := http.NewServeMux()
	h.Register(mux)
	return h, mux
}

func doRequest(mux http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	var bodyReader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, bodyReader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	return w
}

func decodeBody(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.NewDecoder(w.Body).Decode(v); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
}

var fixedTime = time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

func sampleTodo() *todo.Todo {
	return &todo.Todo{
		ID:          "todo_1",
		Title:       "Buy milk",
		Description: "From the store",
		Done:        false,
		UserID:      "user_1",
		CreatedAt:   fixedTime,
		UpdatedAt:   fixedTime,
	}
}

// --- POST /todos ---

func TestCreateTodo(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			create: func(td *todo.Todo) error { return nil },
		})

		w := doRequest(mux, "POST", "/todos", createRequest{
			Title:       "Buy milk",
			Description: "From the store",
			UserID:      "user_1",
		})

		if w.Code != http.StatusCreated {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusCreated)
		}

		var resp todoResponse
		decodeBody(t, w, &resp)
		if resp.Title != "Buy milk" {
			t.Errorf("got title %q, want %q", resp.Title, "Buy milk")
		}
		if resp.UserID != "user_1" {
			t.Errorf("got user_id %q, want %q", resp.UserID, "user_1")
		}
	})

	t.Run("validation error returns 400", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			create: func(td *todo.Todo) error { return nil },
		})

		w := doRequest(mux, "POST", "/todos", createRequest{
			Title:  "",
			UserID: "user_1",
		})

		if w.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusBadRequest)
		}
	})

	t.Run("invalid JSON returns 400", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{})

		req := httptest.NewRequest("POST", "/todos", bytes.NewReader([]byte("not json")))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusBadRequest)
		}
	})

	t.Run("store error returns 500", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			create: func(td *todo.Todo) error { return errors.New("db down") },
		})

		w := doRequest(mux, "POST", "/todos", createRequest{
			Title:  "Buy milk",
			UserID: "user_1",
		})

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusInternalServerError)
		}
	})
}

// --- GET /todos/{id} ---

func TestGetTodo(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		sample := sampleTodo()
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return sample, nil },
		})

		w := doRequest(mux, "GET", "/todos/todo_1", nil)

		if w.Code != http.StatusOK {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
		}

		var resp todoResponse
		decodeBody(t, w, &resp)
		if resp.ID != "todo_1" {
			t.Errorf("got id %q, want %q", resp.ID, "todo_1")
		}
		if resp.Title != "Buy milk" {
			t.Errorf("got title %q, want %q", resp.Title, "Buy milk")
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return nil, nil },
		})

		w := doRequest(mux, "GET", "/todos/nope", nil)

		if w.Code != http.StatusNotFound {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusNotFound)
		}
	})

	t.Run("store error returns 500", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return nil, errors.New("db down") },
		})

		w := doRequest(mux, "GET", "/todos/todo_1", nil)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusInternalServerError)
		}
	})
}

// --- PATCH /todos/{id} ---

func TestUpdateTodo(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		sample := sampleTodo()
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return sample, nil },
			update:   func(td *todo.Todo) error { return nil },
		})

		newTitle := "Buy oat milk"
		w := doRequest(mux, "PATCH", "/todos/todo_1", updateRequest{
			Title: &newTitle,
		})

		if w.Code != http.StatusOK {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
		}

		var resp todoResponse
		decodeBody(t, w, &resp)
		if resp.Title != "Buy oat milk" {
			t.Errorf("got title %q, want %q", resp.Title, "Buy oat milk")
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return nil, nil },
		})

		newTitle := "Updated"
		w := doRequest(mux, "PATCH", "/todos/nope", updateRequest{
			Title: &newTitle,
		})

		if w.Code != http.StatusNotFound {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusNotFound)
		}
	})

	t.Run("invalid JSON returns 400", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{})

		req := httptest.NewRequest("PATCH", "/todos/todo_1", bytes.NewReader([]byte("not json")))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusBadRequest)
		}
	})
}

// --- DELETE /todos/{id} ---

func TestDeleteTodo(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		sample := sampleTodo()
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return sample, nil },
			delete:   func(id string) error { return nil },
		})

		w := doRequest(mux, "DELETE", "/todos/todo_1", nil)

		if w.Code != http.StatusNoContent {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusNoContent)
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByID: func(id string) (*todo.Todo, error) { return nil, nil },
		})

		w := doRequest(mux, "DELETE", "/todos/nope", nil)

		if w.Code != http.StatusNotFound {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusNotFound)
		}
	})
}

// --- GET /users/{user_id}/todos ---

func TestListTodos(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		todos := []*todo.Todo{sampleTodo()}
		_, mux := newTestHandler(&mockStore{
			findByUserID: func(userID string) ([]*todo.Todo, error) { return todos, nil },
		})

		w := doRequest(mux, "GET", "/users/user_1/todos", nil)

		if w.Code != http.StatusOK {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
		}

		var resp []todoResponse
		decodeBody(t, w, &resp)
		if len(resp) != 1 {
			t.Fatalf("got %d todos, want 1", len(resp))
		}
		if resp[0].Title != "Buy milk" {
			t.Errorf("got title %q, want %q", resp[0].Title, "Buy milk")
		}
	})

	t.Run("empty list returns empty array", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByUserID: func(userID string) ([]*todo.Todo, error) { return []*todo.Todo{}, nil },
		})

		w := doRequest(mux, "GET", "/users/user_1/todos", nil)

		if w.Code != http.StatusOK {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
		}

		var resp []todoResponse
		decodeBody(t, w, &resp)
		if len(resp) != 0 {
			t.Fatalf("got %d todos, want 0", len(resp))
		}
	})

	t.Run("store error returns 500", func(t *testing.T) {
		_, mux := newTestHandler(&mockStore{
			findByUserID: func(userID string) ([]*todo.Todo, error) { return nil, errors.New("db down") },
		})

		w := doRequest(mux, "GET", "/users/user_1/todos", nil)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("got status %d, want %d", w.Code, http.StatusInternalServerError)
		}
	})
}

// --- Content-Type ---

func TestResponseContentType(t *testing.T) {
	sample := sampleTodo()
	_, mux := newTestHandler(&mockStore{
		findByID: func(id string) (*todo.Todo, error) { return sample, nil },
	})

	w := doRequest(mux, "GET", "/todos/todo_1", nil)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("got Content-Type %q, want %q", ct, "application/json")
	}
}
