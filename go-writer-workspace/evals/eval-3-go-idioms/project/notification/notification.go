package notification

import "fmt"

type Sender interface {
	Send(to, subject, body string) error
}

type EmailSender struct{}

func (e *EmailSender) Send(to, subject, body string) error {
	fmt.Printf("EMAIL to %s: %s\n", to, subject)
	return nil
}
