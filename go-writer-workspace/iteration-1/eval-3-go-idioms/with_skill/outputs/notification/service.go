package notification

import (
	"fmt"

	"github.com/example/notifier/user"
)

// PreferenceSource resolves which notification channels a user has enabled.
// If nil is passed to NewNotificationService, the service falls back to
// inferring channels from the User struct fields (email set = email enabled,
// phone set = SMS enabled).
type PreferenceSource interface {
	Channels(userID string) []string
}

// NotificationService decides which channels to use for a given user and
// dispatches the notification accordingly.
type NotificationService struct {
	email Sender
	sms   Sender
	prefs PreferenceSource
}

// NewNotificationService creates a service with the given senders. The prefs
// parameter is optional — pass nil to infer channels from user fields.
func NewNotificationService(email, sms Sender, prefs PreferenceSource) *NotificationService {
	return &NotificationService{
		email: email,
		sms:   sms,
		prefs: prefs,
	}
}

// Notify sends a notification to the user on all their enabled channels.
func (n *NotificationService) Notify(u user.User, subject, body string) error {
	channels := n.resolveChannels(u)
	if len(channels) == 0 {
		return fmt.Errorf("notify %s: no channels available", u.ID)
	}

	var errs []error
	for _, ch := range channels {
		var err error
		switch ch {
		case "email":
			if n.email != nil {
				err = n.email.Send(u.Email, subject, body)
			}
		case "sms":
			if n.sms != nil {
				err = n.sms.Send(u.Phone, subject, body)
			}
		}
		if err != nil {
			errs = append(errs, fmt.Errorf("channel %s: %w", ch, err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("notify %s: %d channel(s) failed: %v", u.ID, len(errs), errs)
	}
	return nil
}

func (n *NotificationService) resolveChannels(u user.User) []string {
	if n.prefs != nil {
		return n.prefs.Channels(u.ID)
	}
	// Infer from user fields: if the field is set, the channel is available.
	var channels []string
	if u.Email != "" {
		channels = append(channels, "email")
	}
	if u.Phone != "" {
		channels = append(channels, "sms")
	}
	return channels
}
