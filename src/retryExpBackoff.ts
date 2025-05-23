/**
 * Internal helper for retrying network requests
 * 
 * @param callback 
 * @param config 
 * delay is a number in milliseconds
 * 
 * @returns 
 */
export async function retryExpBackoff<T>(
    callback: () => Promise<T>,
    config: {
        delay: number
        maxRetries: number
    }
): Promise<T> {
    let attempt = 1
    let lastError: Error | undefined = undefined

    while (attempt <= config.maxRetries) {
        try {
            const res = await callback()

            return res
        } catch (e) {
            lastError = e as Error
        }

        attempt++

        if (attempt <= config.maxRetries) {
            await new Promise((resolve) => {
                setTimeout(resolve, config.delay * Math.pow(2, attempt - 1))
            })
        }
    }

    throw lastError
}
