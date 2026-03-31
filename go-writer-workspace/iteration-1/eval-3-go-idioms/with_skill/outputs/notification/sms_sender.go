package notification

import "fmt"

// SMSSender sends SMS messages via Twilio.
type SMSSender struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

// NewSMSSender creates an SMSSender with the required Twilio credentials.
func NewSMSSender(accountSID, authToken, fromNumber string) *SMSSender {
	return &SMSSender{
		AccountSID: accountSID,
		AuthToken:  authToken,
		FromNumber: fromNumber,
	}
}

// Send delivers an SMS to the given phone number. The subject parameter is
// ignored since SMS has no subject concept — only body is sent.
func (s *SMSSender) Send(to, subject, body string) error {
	if to == "" {
		return fmt.Errorf("sms send: recipient phone number is empty")
	}
	if s.FromNumber == "" {
		return fmt.Errorf("sms send: from number is not configured")
	}
	// In production, this would call the Twilio REST API:
	// POST https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json
	fmt.Printf("SMS from %s to %s: %s\n", s.FromNumber, to, body)
	return nil
}
