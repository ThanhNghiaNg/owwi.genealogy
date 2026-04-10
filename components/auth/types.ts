export interface FormState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

export const initialFormState: FormState = {
  loading: false,
  error: null,
  success: null,
};
