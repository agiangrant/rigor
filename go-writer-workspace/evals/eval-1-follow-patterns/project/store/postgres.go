package store

import "github.com/example/taskapp/user"

type PostgresUserStore struct{}

func NewPostgresUserStore() *PostgresUserStore { return &PostgresUserStore{} }

func (s *PostgresUserStore) FindByID(id string) (*user.User, error)       { return nil, nil }
func (s *PostgresUserStore) FindByEmail(email string) (*user.User, error)  { return nil, nil }
func (s *PostgresUserStore) FindAll() ([]*user.User, error)                { return nil, nil }
func (s *PostgresUserStore) Create(u *user.User) error                     { return nil }
