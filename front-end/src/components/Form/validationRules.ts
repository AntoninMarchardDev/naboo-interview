type ValidationRule<T> = (value: T) => string | null;

const isValidEmail = (value: string) => /^\S+@\S+$/.test(value);
const isNumberGreaterThanZero = (value: number) => value > 0;

/**
 * User
 */
export const emailValidation: ValidationRule<string> = (value) =>
  isValidEmail(value) ? null : "Email invalide";

export const passwordValidation: ValidationRule<string> = (value) => {
  if (value.length < 4)
    return "Le mot de passe doit contenir au moins 8 caractères";
  return null;
};

export const firstNameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le prénom est requis";

export const lastNameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le nom est requis";

/**
 * Activity
 */
export const nameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le nom est requis";

export const descriptionValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "La description est requise";

export const cityValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "La localisation est requise";

export const priceValidation: ValidationRule<number> = (value) =>
  isNumberGreaterThanZero(value)
    ? null
    : "Le prix est requis et doit être supérieur à 0";
