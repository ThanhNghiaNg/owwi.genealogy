export interface AuthenticatedUser {
  id: string;
  email: string;
  hasGoogleLinked: boolean;
}

export interface RequestOtpInput {
  email: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}
