// What the hosted sign-in session endpoints answer.

/** One way to complete the second-factor challenge, as the server lists them. */
export type LoginFactor = {
  type: "totp" | "recovery_code" | "email" | "sms" | "passkey" | "push";
  id?: string;
  destination?: string;
};

// The hosted-login session endpoint returns either the user id (cookie set) or,
// when the account holds a second factor or must have one, a pending MFA
// challenge to complete. An enrolment challenge (enrollment_required) is met
// by setting up an authenticator app; enrollment_due_at, when present, is the
// end of the organisation's grace period, until which it can be skipped.
export type SessionResponse = {
  user_id?: string;
  mfa_required?: boolean;
  mfa_token?: string;
  methods?: string[];
  factors?: LoginFactor[];
  enrollment_required?: boolean;
  enrollment_due_at?: string;
};
