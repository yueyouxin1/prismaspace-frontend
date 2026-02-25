export interface AuthValidationResult {
  valid: boolean
  message: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\+?[0-9\- ]{8,20}$/

export const validateAccount = (value: string): AuthValidationResult => {
  if (!value.trim()) {
    return { valid: false, message: '请输入邮箱或手机号。' }
  }

  const isEmail = emailRegex.test(value)
  const isPhone = phoneRegex.test(value)
  if (!isEmail && !isPhone) {
    return { valid: false, message: '账号格式不正确。' }
  }

  return { valid: true, message: '' }
}

export const validateEmail = (value: string): AuthValidationResult => {
  if (!value.trim()) {
    return { valid: false, message: '请输入邮箱地址。' }
  }

  if (!emailRegex.test(value)) {
    return { valid: false, message: '邮箱格式不正确。' }
  }

  return { valid: true, message: '' }
}

export const validatePassword = (value: string): AuthValidationResult => {
  if (value.length < 8) {
    return { valid: false, message: '密码至少 8 位。' }
  }

  if (!/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return { valid: false, message: '密码需包含大写字母和数字。' }
  }

  return { valid: true, message: '' }
}

export const useAuthFormRules = () => {
  return {
    validateAccount,
    validateEmail,
    validatePassword,
  }
}
