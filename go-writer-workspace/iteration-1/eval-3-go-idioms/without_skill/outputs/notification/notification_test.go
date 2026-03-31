package notification

import (
	"errors"
	"strings"
	"testing"

	"github.com/example/notifier/user"
)

// spySender records calls and optionally returns an error.
type spySender struct {
	calls []call
	err   error
}

type call struct {
	to, subject, body string
}

func (s *spySender) Send(to, subject, body string) error {
	s.calls = append(s.calls, call{to, subject, body})
	return s.err
}

func TestSMSSender_ImplementsSender(t *testing.T) {
	var _ Sender = (*SMSSender)(nil)
}

func TestMultiSender_FansOut(t *testing.T) {
	a := &spySender{}
	b := &spySender{}
	m := &MultiSender{Senders: []Sender{a, b}}

	err := m.Send("+1234", "subj", "body")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(a.calls) != 1 || len(b.calls) != 1 {
		t.Fatalf("expected 1 call each, got a=%d b=%d", len(a.calls), len(b.calls))
	}
}

func TestMultiSender_CollectsErrors(t *testing.T) {
	a := &spySender{err: errors.New("fail a")}
	b := &spySender{err: errors.New("fail b")}
	m := &MultiSender{Senders: []Sender{a, b}}

	err := m.Send("x", "y", "z")
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "fail a") || !strings.Contains(err.Error(), "fail b") {
		t.Fatalf("expected both errors, got: %v", err)
	}
}

func TestNotificationService_RoutesBasedOnPreferences(t *testing.T) {
	emailSpy := &spySender{}
	smsSpy := &spySender{}

	svc := &NotificationService{
		Channels: map[string]Sender{
			"email": emailSpy,
			"sms":   smsSpy,
		},
	}

	u := user.User{
		Email: "a@b.com",
		Phone: "+1555",
		Preferences: user.Preferences{
			Channels: []string{"email", "sms"},
		},
	}

	err := svc.Notify(u, "hello", "world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(emailSpy.calls) != 1 {
		t.Fatalf("expected 1 email call, got %d", len(emailSpy.calls))
	}
	if emailSpy.calls[0].to != "a@b.com" {
		t.Fatalf("expected email to a@b.com, got %s", emailSpy.calls[0].to)
	}
	if len(smsSpy.calls) != 1 {
		t.Fatalf("expected 1 sms call, got %d", len(smsSpy.calls))
	}
	if smsSpy.calls[0].to != "+1555" {
		t.Fatalf("expected sms to +1555, got %s", smsSpy.calls[0].to)
	}
}

func TestNotificationService_SkipsUnknownChannels(t *testing.T) {
	emailSpy := &spySender{}
	svc := &NotificationService{
		Channels: map[string]Sender{
			"email": emailSpy,
		},
	}

	u := user.User{
		Email: "a@b.com",
		Preferences: user.Preferences{
			Channels: []string{"email", "push"},
		},
	}

	err := svc.Notify(u, "subj", "body")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(emailSpy.calls) != 1 {
		t.Fatalf("expected 1 email call, got %d", len(emailSpy.calls))
	}
}

func TestNotificationService_OnlySMS(t *testing.T) {
	smsSpy := &spySender{}
	svc := &NotificationService{
		Channels: map[string]Sender{
			"sms": smsSpy,
		},
	}

	u := user.User{
		Phone: "+1999",
		Preferences: user.Preferences{
			Channels: []string{"sms"},
		},
	}

	err := svc.Notify(u, "subj", "your code is ready")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if smsSpy.calls[0].body != "your code is ready" {
		t.Fatalf("unexpected body: %s", smsSpy.calls[0].body)
	}
}

func TestNotificationService_SkipsMissingDestination(t *testing.T) {
	smsSpy := &spySender{}
	svc := &NotificationService{
		Channels: map[string]Sender{
			"sms": smsSpy,
		},
	}

	// User wants SMS but has no phone number
	u := user.User{
		Preferences: user.Preferences{
			Channels: []string{"sms"},
		},
	}

	err := svc.Notify(u, "subj", "body")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(smsSpy.calls) != 0 {
		t.Fatalf("expected 0 calls for user with no phone, got %d", len(smsSpy.calls))
	}
}
