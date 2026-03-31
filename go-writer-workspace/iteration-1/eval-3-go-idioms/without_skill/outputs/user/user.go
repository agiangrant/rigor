package user

type Preferences struct {
	Channels []string
}

type User struct {
	ID          string
	Email       string
	Name        string
	Phone       string
	Preferences Preferences
}
