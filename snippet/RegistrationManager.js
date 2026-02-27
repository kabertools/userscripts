/**
 * A simple class to manage the registration and cleanup of the different event listeners and mutations observers using the register pattern.
 * 
 * This class is useful when several registrations need to be done at different times and cleaned up together. 
 */
class RegistrationManager {
    /**
     * Create a new RegistrationManager instance.
     * 
     * @param {Objet} options additional options
     * @param {boolean} [options.autoCleanupOnAfterFirstCleanup=false] automatically call cleanup after the first call of cleanupAll (This instance of RegistrationManager will be only used once, but any late registration will be automatically cleaned up)
     */
    constructor(options) {
        this.cleanupFunctions = []
        this.options = options || {}
        this.autoCleanupOnAfterFirstCleanup = this.options.autoCleanupOnAfterFirstCleanup || false
        this.hasBeenCleanedUp = false
    }

    /**
     * Add a new cleanup function
     * @param {() => void} cleanupFunction 
     */
    onRegistration(cleanupFunction) {
        if (this.autoCleanupOnAfterFirstCleanup && this.hasBeenCleanedUp) {
            cleanupFunction()
        } else {
            this.cleanupFunctions.push(cleanupFunction)
        }
    }

    /**
     * Cleanup all the cleanup functions.
     */
    cleanupAll() {
        this.hasBeenCleanedUp = true
        this.cleanupFunctions.forEach(cleanup => cleanup())
        this.cleanupFunctions.length = 0
    }
}
