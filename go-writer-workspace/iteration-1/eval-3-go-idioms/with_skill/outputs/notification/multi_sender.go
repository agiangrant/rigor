package notification

import "fmt"

// MultiSender fans out a notification to multiple senders. It implements Sender,
// so it composes with anything that accepts a Sender.
type MultiSender struct {
	senders []Sender
}

// NewMultiSender creates a MultiSender from the given senders.
func NewMultiSender(senders ...Sender) *MultiSender {
	return &MultiSender{senders: senders}
}

// Send delivers the message through all senders. If any sender fails, it
// continues to the remaining senders and returns a combined error.
func (m *MultiSender) Send(to, subject, body string) error {
	var errs []error
	for _, s := range m.senders {
		if err := s.Send(to, subject, body); err != nil {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("multi send: %d of %d senders failed: %v", len(errs), len(m.senders), errs)
	}
	return nil
}
