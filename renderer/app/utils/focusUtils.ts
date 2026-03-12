import { FocusEvent } from 'react';

export const handleInputFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  // Prevent auto-selection and move cursor to end
  const input = e.target;
  // Use setTimeout to ensure this runs after any default focus/select behavior
  setTimeout(() => {
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
};
