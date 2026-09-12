/** Validation messages. `{label}`, `{value}`, `{min}` ... are replaced per rule. Korean defaults keep parity with the legacy grid. */
export interface MjMessages {
  required: string
  min: string
  max: string
  size: string
  minEqual: string
  maxEqual: string
  sizeEqual: string
  length: string
  email: string
  password: string
  passwordRepeat: string
  mask: string
  duplicate: string
  notDuplicate: string
  invalidDate: string
}

export const koMessages: MjMessages = {
  required: '{label}은(는) 필수입력 사항입니다.',
  min: '{label}은(는) {min}보다 커야 합니다.',
  max: '{label}은(는) {max}보다 작아야 합니다.',
  size: '{label}은(는) {min}에서 {max}사이의 숫자를 입력해 주세요.',
  minEqual: '{label}은(는) {minEqual}보다 커야 합니다.',
  maxEqual: '{label}은(는) {maxEqual}보다 작아야 합니다.',
  sizeEqual: '{label}은(는) {minEqual}에서 {maxEqual}사이의 숫자를 입력해 주세요.',
  length: '{label}은(는) {minLength}~{maxLength}자로 입력해 주세요.',
  email: '올바른 이메일 형식이 아닙니다. 다시 확인해 주세요.',
  password: '비밀번호는 6~20자의 영문 대소문자, 숫자 또는 특수문자를 사용해주세요',
  passwordRepeat: '비밀번호가 일치하지 않습니다.',
  mask: '{value}은(는), {label} 형식이 아닙니다. 다시 확인해 주세요.',
  duplicate: '{value}은(는) 중복된 {label}입니다.',
  notDuplicate: '{value}은(는) 사용 가능한 {label}입니다.',
  invalidDate: '유효한 {label}을(를) 선택하세요.'
}

export const enMessages: MjMessages = {
  required: '{label} is required.',
  min: '{label} must be greater than {min}.',
  max: '{label} must be less than {max}.',
  size: '{label} must be between {min} and {max}.',
  minEqual: '{label} must be greater than {minEqual}.',
  maxEqual: '{label} must be less than {maxEqual}.',
  sizeEqual: '{label} must be between {minEqual} and {maxEqual}.',
  length: '{label} must be {minLength}-{maxLength} characters.',
  email: 'Invalid email address.',
  password: 'Password must be 6-20 characters with letters and a number or symbol.',
  passwordRepeat: 'Passwords do not match.',
  mask: '{value} does not match the {label} format.',
  duplicate: '{value} is a duplicate {label}.',
  notDuplicate: '{value} is available.',
  invalidDate: 'Select a valid {label}.'
}

export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])))
}
