// ==UserScript==
// @name        la-cale-change-image-format-for-some-categories
// @namespace   https://github.com/kabertools/userscripts/
// @version     20260311-075943-1ef4e58
// @description la-cale-change-image-format-for-some-categories
// @author      kaberly
// @homepage    https://github.com/kabertools/userscripts/
// @supportURL  https://github.com/kabertools/userscripts/
// @match       https://la-cale.space/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=la-cale.space
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

const script_name = GM_info?.script?.name || 'no-name'
const script_version = GM_info?.script?.version || 'no-version'
const script_id = `${script_name} ${script_version}`
console.log(`Begin - ${script_id}`)


// @imported_begin{getSubElements}
/**
 * Request some sub elements from an element
 *
 * @param {HTMLElement} element The element to query
 * @param {string} query The query
 * @returns {[HTMLElement]}
 */
const getSubElements = (element, query) => [...element.querySelectorAll(query)]
// @imported_end{getSubElements}

// @imported_begin{getElements}
/**
 * Request some elements from the current document
 *
 * @param {string} query The query
 * @returns {[HtmlElement]}
 */
const getElements = (query) => getSubElements(document, query)
// @imported_end{getElements}

// @imported_begin{registerDomNodeMutated}
/**
 * Call the callback when the document change
 * Handle the fact that the callback can't be called while aleady being called (no stackoverflow). 
 * Use the register pattern thus return the unregister function as a result
 * @param {()=>()} callback 
 * @return {()=>{}} The unregister function
 */
const registerDomNodeMutated = (callback) => {
    let callbackInProgress = false

    const action = () => {
        if (!callbackInProgress) {
            callbackInProgress = true
            callback()
            callbackInProgress = false
        }
    }

    const mutationObserver = new MutationObserver((mutationsList, observer) => { action() });
    action()
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

    return () => mutationObserver.disconnect()
}
// @imported_end{registerDomNodeMutated}

// @imported_begin{registerDomNodeMutatedUnique}
/**
 * Call the callback once per element provided by the elementProvider when the document change
 * Handle the fact that the callback can't be called while aleady being called (no stackoverflow). 
 * Use the register pattern thus return the unregister function as a result
 * 
 * Ensure that when an element matching the query elementProvider, the callback is called with the element 
 * exactly once for each element
 * @param {()=>[HTMLElement]} elementProvider 
 * @param {(element: HTMLElement, options: {currentIteration: number, indexElement: number})=>{}} callback 
 * @param {(element: HTMLElement, options: {currentIteration: number})=>{}} [callbackOnNotHere] called when an element is not here anymore (not provided by the elementProvider anymore)
 */
const registerDomNodeMutatedUnique = (elementProvider, callback, callbackOnNotHere) => {
    const domNodesHandled = new Map()
    let indexIteration = 0

    return registerDomNodeMutated(() => {
        indexIteration++;
        let currentIteration = indexIteration
        let indexElement = 0
        for (let element of elementProvider()) {
            if (!domNodesHandled.has(element)) {
                domNodesHandled.set(element, { element, indexIteration: currentIteration })
                const result = callback(element, { currentIteration, indexElement })
                if (result === false) {
                    domNodesHandled.delete(element)
                }
            } else {
                domNodesHandled.get(element).indexIteration = currentIteration
            }
            indexElement++;
        }
        for (let item of domNodesHandled.values().filter(item => item.indexIteration !== currentIteration)) {
            if (callbackOnNotHere) {
                callbackOnNotHere(item.element, { currentIteration })
            }
            domNodesHandled.delete(item.element)
        }
    })
}
// @imported_end{registerDomNodeMutatedUnique}

// @imported_begin{registerLocationChange}
/**
 * Registers a callback to be called when the location changes (SPA navigation)
 * 
 * @param {(Location)=>void} callback A callback called when the location changes
 * @returns {()=>void} The unregister function
 */
const registerLocationChange = (callback) => {
    const normalizeLocation = (location) => {
        const { href, origin, protocol, host, hostname, port, pathname, search, hash } = location;
        const pathParts = pathname.split('/')
        if (pathParts.length > 0 && pathParts[0] === '') {
            pathParts.shift();
        }
        const isFolder = pathParts.length === 0 || pathParts[pathParts.length - 1] === '';
        if (isFolder) {
            pathParts.pop();
        }

        return { href, origin, protocol, host, hostname, port, pathname, pathParts, isFolder, search, hash };
    }
    let currentLocation = normalizeLocation(location);

    const observer = new MutationObserver(() => {
        const newLocation = normalizeLocation(location);
        if (newLocation.href !== currentLocation.href) {
            currentLocation = newLocation;
            callback(currentLocation);
        }
    });

    callback(currentLocation);
    observer.observe(document, { subtree: true, childList: true });

    return () => {
        observer.disconnect();
    };
}
// @imported_end{registerLocationChange}

// @imported_begin{RegistrationManager}
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
// @imported_end{RegistrationManager}

// @imported_begin{monkeyGetSetValue}
/**
 * Récupère ou définit une valeur dans le stockage de Tampermonkey/Greasemonkey/Violentmonkey/etc.
 * 
 * @param {String} key La clé de la valeur à récupérer ou définir
 * @param {String} value La valeur par défaut à définir si la clé n'existe pas (optionnel) 
 * @returns {String} La valeur récupérée
 */
const monkeyGetSetValue = (key, value) => {
    const storedValue = GM_getValue(key);
    if (storedValue === undefined && value !== undefined) {
        GM_setValue(key, value);
        return value;
    }
    return storedValue;
}
// @imported_end{monkeyGetSetValue}

// @main_begin{la-cale-change-image-format-for-some-categories}
const categoriesToChangeVertical = monkeyGetSetValue('categoriesToChangeVertical', ['BD','Comics','Divers','Livres','Mangas','Presse','Audiobooks'])
const categoriesToChangeSquare = monkeyGetSetValue('categoriesToChangeSquare', ['Musique','Podcast'])

const categoriesToChange = [
    {
        list: categoriesToChangeVertical,
        newClass: 'aspect-[2/3]',
        oldClass: 'aspect-video',
    },
    {
        list: categoriesToChangeSquare,
        newClass: 'aspect-square',
        oldClass: 'aspect-video',
    },
]

const main = async () => {
    const registrationManager = new RegistrationManager()
    registerLocationChange((location) => {
        registrationManager.cleanupAll()

        const pathParts = location.pathname.split('/')
        if (pathParts.length === 3 && pathParts[1] === 'torrents') {
            registrationManager.onRegistration(registerDomNodeMutatedUnique(
                () => getElements('.flex.flex-wrap.items-center.gap-2.mb-3>div.bg-brand-primary'),
                (node) => {
                    for (const { list, newClass, oldClass } of categoriesToChange) {
                        if (list.indexOf(node.textContent) > -1) {
                            const imageContainer = getElements(`.${oldClass}`)[0]
                            if (imageContainer) {
                                imageContainer.classList.remove(oldClass)
                                imageContainer.classList.add(newClass)
                            }
                        }
                    }
                }
            ))
        }
    })
}

main()
// @main_end{la-cale-change-image-format-for-some-categories}

console.log(`End - ${script_id}`)
