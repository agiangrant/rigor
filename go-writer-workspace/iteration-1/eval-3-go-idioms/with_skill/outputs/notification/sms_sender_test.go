package notification

import "testing"

func TestSMSSender_Send(t *testing.T) {
	s := NewSMSSender("acct123", "token456", "+15551234567")

	err := s.Send("+15559876543", "Welcome", "Hello from our app")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestSMSSender_Send_EmptyRecipient(t *testing.T) {
	s := NewSMSSender("acct123", "token456", "+15551234567")

	err := s.Send("", "Welcome", "Hello")
	if err == nil {
		t.Fatal("expected error for empty recipient, got nil")
	}
}

func TestSMSSender_Send_NoFromNumber(t *testing.T) {
	s := &SMSSender{AccountSID: "acct123", AuthToken: "token456"}

	err := s.Send("+15559876543", "Welcome", "Hello")
	if err == nil {
		t.Fatal("expected error for missing from number, got nil")
	}
}

func TestSMSSender_ImplementsSender(t *testing.T) {
	var _ Sender = (*SMSSender)(nil)
}
