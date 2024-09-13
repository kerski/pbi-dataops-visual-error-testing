/**
 * Logs a message to the console if verbose logging is enabled.
 *
 * @param {any} message - The message to log.
 * @param {boolean} isVerboseLogging - A flag indicating whether verbose logging is enabled.
 * @returns {void}
 */
export function logToConsole(message: any, isVerboseLogging: boolean): void {
    if (isVerboseLogging) {
        console.log(message);
    } // end if
}