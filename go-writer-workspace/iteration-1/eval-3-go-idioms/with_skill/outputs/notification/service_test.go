package notification

import (
	"testing"

	"github.com/example/notifier/user"
)

type recordingSender struct {
	calls []struct{ to, subject, body string }
}

func (r *recordingSender) Send(to, subject, body string) error {
	r.calls = append(r.calls, struct{ to, subject, body string }{to, subject, body})
	return nil
}

type staticPrefs struct {
	channels []string
}

func (s *staticPrefs) Channels(userID string) []string {
	return s.channels
}

func TestNotificationService_Notify_EmailOnly(t *testing.T) {
	email := &recordingSender{}
	sms := &recordingSender{}
	svc := NewNotificationService(email, sms, nil)

	u := user.User{ID: "u1", Email: "alice@example.com", Name: "Alice"}

	err := svc.Notify(u, "Hello", "Welcome aboard")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(email.calls) != 1 {
		t.Fatalf("expected 1 email call, got %d", len(email.calls))
	}
	if len(sms.calls) != 0 {
		t.Fatalf("expected 0 sms calls, got %d", len(sms.calls))
	}
	if email.calls[0].to != "alice@example.com" {
		t.Fatalf("expected email to alice@example.com, got %s", email.calls[0].to)
	}
}

func TestNotificationService_Notify_BothChannels(t *testing.T) {
	email := &recordingSender{}
	sms := &recordingSender{}
	svc := NewNotificationService(email, sms, nil)

	u := user.User{ID: "u2", Email: "bob@example.com", Phone: "+15551234567", Name: "Bob"}

	err := svc.Notify(u, "Alert", "Something happened")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(email.calls) != 1 {
		t.Fatalf("expected 1 email call, got %d", len(email.calls))
	}
	if len(sms.calls) != 1 {
		t.Fatalf("expected 1 sms call, got %d", len(sms.calls))
	}
}

func TestNotificationService_Notify_NoChannels(t *testing.T) {
	svc := NewNotificationService(&recordingSender{}, &recordingSender{}, nil)

	u := user.User{ID: "u3", Name: "NoContact"}

	err := svc.Notify(u, "Hello", "You won't get this")
	if err == nil {
		t.Fatal("expected error when no channels available, got nil")
	}
}

func TestNotificationService_Notify_WithPreferenceSource(t *testing.T) {
	email := &recordingSender{}
	sms := &recordingSender{}
	prefs := &staticPrefs{channels: []string{"sms"}}
	svc := NewNotificationService(email, sms, prefs)

	// User has both email and phone, but prefs say SMS only.
	u := user.User{ID: "u4", Email: "carol@example.com", Phone: "+15559999999", Name: "Carol"}

	err := svc.Notify(u, "Promo", "50% off")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(email.calls) != 0 {
		t.Fatalf("expected 0 email calls (prefs override), got %d", len(email.calls))
	}
	if len(sms.calls) != 1 {
		t.Fatalf("expected 1 sms call, got %d", len(sms.calls))
	}
}
