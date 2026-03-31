package notification

import (
	"fmt"
	"testing"
)

type stubSender struct {
	calls []string
	err   error
}

func (s *stubSender) Send(to, subject, body string) error {
	s.calls = append(s.calls, to)
	return s.err
}

func TestMultiSender_Send_AllSucceed(t *testing.T) {
	a := &stubSender{}
	b := &stubSender{}
	multi := NewMultiSender(a, b)

	err := multi.Send("recipient", "subj", "body")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(a.calls) != 1 || len(b.calls) != 1 {
		t.Fatalf("expected each sender called once, got %d and %d", len(a.calls), len(b.calls))
	}
}

func TestMultiSender_Send_OneFails(t *testing.T) {
	good := &stubSender{}
	bad := &stubSender{err: fmt.Errorf("boom")}
	multi := NewMultiSender(bad, good)

	err := multi.Send("recipient", "subj", "body")
	if err == nil {
		t.Fatal("expected error when one sender fails, got nil")
	}
	// The good sender should still have been called.
	if len(good.calls) != 1 {
		t.Fatal("expected good sender to still be called after bad sender fails")
	}
}

func TestMultiSender_Send_Empty(t *testing.T) {
	multi := NewMultiSender()

	err := multi.Send("recipient", "subj", "body")
	if err != nil {
		t.Fatalf("expected no error for empty multi sender, got %v", err)
	}
}

func TestMultiSender_ImplementsSender(t *testing.T) {
	var _ Sender = (*MultiSender)(nil)
}
