import { emitBusinessError } from '@app/services/http/error-gateway'

export const withBusinessHandling = async <T>(action: () => Promise<T>): Promise<T> => {
  try {
    return await action()
  } catch (error) {
    emitBusinessError(error)
    throw error
  }
}
