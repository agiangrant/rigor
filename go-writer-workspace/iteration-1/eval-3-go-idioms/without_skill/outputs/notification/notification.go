package notification

import (
	"errors"
	"fmt"

	"github.com/example/notifier/user"
)

type Sender interface {
	Send(to, subject, body string) error
}

type EmailSender struct{}

func (e *EmailSender) Send(to, subject, body string) error {
	fmt.Printf("EMAIL to %s: %s\n", to, subject)
	return nil
}

// SMSSender sends notifications via Twilio.
type SMSSender struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

func (s *SMSSender) Send(to, subject, body string) error {
	// subject is ignored for SMS — the medium has no concept of it.
	fmt.Printf("SMS to %s from %s: %s\n", to, s.FromNumber, body)
	return nil
}

// MultiSender fans out a send to multiple senders, collecting all errors.
type MultiSender struct {
	Senders []Sender
}

func (m *MultiSender) Send(to, subject, body string) error {
	var errs []error
	for _, s := range m.Senders {
		if err := s.Send(to, subject, body); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// NotificationService routes notifications to the right channels
// based on user preferences.
type NotificationService struct {
	Channels map[string]Sender
}

// Notify sends a notification to the user on each of their preferred channels.
// It resolves the destination address per channel (email -> Email, sms -> Phone).
// Unknown channels are silently skipped. Returns a joined error if any sends fail.
func (ns *NotificationService) Notify(u user.User, subject, body string) error {
	var errs []error
	for _, ch := range u.Preferences.Channels {
		sender, ok := ns.Channels[ch]
		if !ok {
			continue
		}
		to := destinationFor(u, ch)
		if to == "" {
			continue
		}
		if err := sender.Send(to, subject, body); err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", ch, err))
		}
	}
	return errors.Join(errs...)
}

func destinationFor(u user.User, channel string) string {
	switch channel {
	case "email":
		return u.Email
	case "sms":
		return u.Phone
	default:
		return ""
	}
}
