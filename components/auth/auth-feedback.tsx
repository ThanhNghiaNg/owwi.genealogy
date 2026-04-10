import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { FormState } from "@/components/auth/types";

export function AuthFeedback({ state }: { state: FormState }) {
  if (!state.error && !state.success) {
    return null;
  }

  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Request failed</AlertTitle>
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>{state.success}</AlertDescription>
    </Alert>
  );
}
