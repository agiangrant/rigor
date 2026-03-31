package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/example/todoapi/todo"
)

// Handler provides HTTP endpoints for the todo service.
type Handler struct {
	svc *todo.Service
}

// New creates a Handler backed by the given service.
func New(svc *todo.Service) *Handler {
	return &Handler{svc: svc}
}

// Register wires all todo routes onto the given mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /todos", h.createTodo)
	mux.HandleFunc("GET /todos/{id}", h.getTodo)
	mux.HandleFunc("PATCH /todos/{id}", h.updateTodo)
	mux.HandleFunc("DELETE /todos/{id}", h.deleteTodo)
	mux.HandleFunc("GET /users/{user_id}/todos", h.listTodos)
}

// --- request/response types ---

type createRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	UserID      string `json:"user_id"`
}

type updateRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Done        *bool   `json:"done"`
}

type todoResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Done        bool   `json:"done"`
	UserID      string `json:"user_id"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// --- handlers ---

func (h *Handler) createTodo(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	t, err := h.svc.Create(todo.CreateInput{
		Title:       req.Title,
		Description: req.Description,
		UserID:      req.UserID,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, toResponse(t))
}

func (h *Handler) getTodo(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	t, err := h.svc.GetByID(id)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, toResponse(t))
}

func (h *Handler) updateTodo(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	t, err := h.svc.Update(id, todo.UpdateInput{
		Title:       req.Title,
		Description: req.Description,
		Done:        req.Done,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, toResponse(t))
}

func (h *Handler) deleteTodo(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	if err := h.svc.Delete(id); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listTodos(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")

	todos, err := h.svc.ListByUser(userID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	resp := make([]todoResponse, len(todos))
	for i, t := range todos {
		resp[i] = toResponse(t)
	}

	writeJSON(w, http.StatusOK, resp)
}

// --- helpers ---

func toResponse(t *todo.Todo) todoResponse {
	return todoResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Done:        t.Done,
		UserID:      t.UserID,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, todo.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, todo.ErrValidation):
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}
