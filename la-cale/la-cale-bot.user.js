// ==UserScript==
// @name        la-cale-bot
// @namespace   https://github.com/kabertools/userscripts/
// @version     20260227-165135-8d3024c
// @description la-cale-bot
// @author      kaberly
// @homepage    https://github.com/kabertools/userscripts/
// @supportURL  https://github.com/kabertools/userscripts/
// @match       https://la-cale.space/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=la-cale.space
// @grant       none
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

// @imported_begin{createElementExtended}
/**
 * Create a new element, and add some properties to it
 * 
 * @param {string} name The name of the element to create
 * @param {object} params The parameters to tweek the new element
 * @param {object.<string, string>} params.attributes The propeties of the new element
 * @param {object.<string, string>} params.style The style properties of the new element
 * @param {string} params.text The textContent of the new element
 * @param {HTMLElement[]} params.children The children of the new element
 * @param {HTMLElement} params.parent The parent of the new element
 * @param {string[]} params.classnames The classnames of the new element
 * @param {string} params.id The classnames of the new element
 * @param {HTMLElement} params.prevSibling The previous sibling of the new element (to insert after)
 * @param {HTMLElement} params.nextSibling The next sibling of the new element (to insert before)
 * @param {(element:HTMLElement)=>{}} params.onCreated called when the element is fully created
 * @returns {HTMLElement} The created element
 */
const createElementExtended = (name, params) => {
    /** @type{HTMLElement} */
    const element = document.createElement(name)
    if (!params) {
        params = {}
    }
    const { attributes, text, children, parent, prependIn, classnames, id, style, prevSibling, nextSibling, onCreated } = params
    if (attributes) {
        for (let attributeName in attributes) {
            element.setAttribute(attributeName, attributes[attributeName])
        }
    }
    if (style) {
        for (let key in style) {
            element.style[key] = style[key];
        }
    }
    if (text) {
        element.textContent = text;
    }
    if (children) {
        const addChild = (child) => {
            if (child) {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child))
                } else if (Array.isArray(child)) {
                    for (let subChild of child) {
                        addChild(subChild)
                    }
                } else {
                    element.appendChild(child)
                }
            }
        }

        for (let child of children) {
            addChild(child)
        }
    }
    if (parent) {
        parent.appendChild(element)
    }
    if (prependIn) {
        prependIn.prepend(element)
    }
    if (classnames) {
        for (let classname of classnames) {
            element.classList.add(classname)
        }
    }
    if (id) {
        element.id = id
    }
    if (prevSibling) {
        prevSibling.parentElement.insertBefore(element, prevSibling.nextSibling)
    }
    if (nextSibling) {
        nextSibling.parentElement.insertBefore(element, nextSibling)
    }
    if (onCreated) {
        onCreated(element)
    }
    return element
}
// @imported_end{createElementExtended}

// @imported_begin{downloadData}
/**
 * Download data as a file
 * 
 * @param {string} filename - The name of the file
 * @param {string} data - The data to download
 * @param {object} options - The options
 * @param {string} options.mimetype - The mimetype of the data
 * @param {string} options.encoding - The encoding to use on the text data if provided
 */
const downloadData = (filename, data, options) => {
    if (!options) {
        options = {}
    }
    let { mimetype, encoding } = options
    if (!mimetype) {
        mimetype = 'application/octet-stream'
    }
    if (encoding) {
        data = new TextEncoder(encoding).encode(data)
    }
    const element = createElementExtended('a', {
        attributes: {
            href: URL.createObjectURL(new Blob([data], { type: mimetype })),
            download: filename,
        }
    })
    element.click()
}
// @imported_end{downloadData}

// @imported_begin{HookableValue}
/**
 * A class representing a value that can have hooks on change
 * @template T The type of the value
 */
class HookableValue {
    /**
     * Constructor
     * @param {string} name The name of the hook
     * @param {T|null} defaultValue The default value
     */
    constructor(name, defaultValue = null) {
        this._name = name;
        this._value = defaultValue;
        this.callbacks = [];
    }

    /**
     * Sets the value and calls the hooks if the value changed
     * 
     * @param {T} newValue The new value
     * @returns {void}
     */
    async setValue(newValue) {
        const oldValue = this.value;
        if (oldValue !== newValue) {
            this._value = newValue;
            for (const callback of this.callbacks) {
                await callback(newValue, oldValue);
            }
        }
    }

    /**
     * Gets the value
     * 
     * @returns {T} The current value
     */
    getValue() {
        return this._value;
    }

    /**
     * Register a callback to be called when the value changes
     * @param {(newValue:T, oldValue:T)=>Promise<void>} callback The callback (that may be async)
     * @returns {()=>void} The unregister function
     */
    register(callback) {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        }
    }

    /**
     * Clears all registered callbacks
     * @returns {void}
     */
    clearCallbacks() {
        this.callbacks = [];
    }

    get value() {
        return this.getValue();
    }

    set value(newValue) {
        this.setValue(newValue);
    }

    get name() {
        return this._name;
    }
}
/** @typedef {HookableValue} HookableValue */
// @imported_end{HookableValue}

// @imported_begin{computeSha256}
/**
 * Compute the SHA-256 hash of the given data.
 * 
 * @param {string|Uint8Array} data The data to hash
 * @param {Object|null} options The options
 * @param {string} options.encoding The encoding to use on the text data if provided
 * @returns {Promise<string>} The SHA-256 hash as a hexadecimal string
 */
const computeSha256 = async (data, options) => {
    if (!options) {
        options = {}
    }
    if (options.encoding) {
        data = new TextEncoder(options.encoding).encode(data)
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
// @imported_end{computeSha256}

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

// @main_begin{la-cale-bot}
class LaCabot {
    constructor() {
        this._name = 'LaCabot'
        this._version = '0.0.1'
        this._onMessageCallbacks = []
        this._onInstalledCallbacks = []
        this._onUninstalledCallbacks = []
        this._titleZone = null
        this._contentZone = null
        this._writeZone = null
        this._toClean = []
    }

    install() {
        this._toClean.push(registerDomNodeMutatedUnique(() => getElements('main>div>div'), (element) => {
            console.log({ element, ecl: element?.children?.length })
            if (element && element.children.length === 3) {
                console.log({ c: element.children })
                const [titleZone, contentZone, writeZone] = element.children
                if (!titleZone || !contentZone || !writeZone) {
                    return false
                }
                console.log({ titleZone, contentZone, writeZone })
                this._titleZone = titleZone
                this._contentZone = contentZone
                this._writeZone = writeZone
                this._toClean.push(registerDomNodeMutatedUnique(() => getSubElements(this._contentZone, 'div.h-full.overflow-y-auto>div.gap-3').reverse(), (line) => {
                    // console.log({line})
                    if (line.children.length == 3) {
                        const props = {}
                        if (line.children && line.children.length >= 3 && line.children[1] && line.children[1].children.length >= 2) {
                            const userElements = line.children[1].children[0].children
                            const messageElement = line.children[1].children[1]
                            if (userElements.length >= 3) {
                                props.user = userElements[0].textContent
                                const fullGradeText = userElements[1].textContent
                                const fullGradeSep = fullGradeText.indexOf(' ')
                                props.grade = fullGradeText.slice(fullGradeSep + 1)
                                props.iconGrade = fullGradeText.slice(0, fullGradeSep)
                                props.serverDate = userElements[2].textContent
                                props.clientDate = new Date().toISOString()
                            }
                            for (let messageElement of [...line.children[1].children].slice(1)) {
                                if (messageElement && messageElement.classList.contains('text-text-primary-medium')) {
                                    props.message = messageElement.textContent
                                    props.messageElement = messageElement
                                }
                                if (messageElement && messageElement.classList.contains('text-text-primary-muted')) {
                                    props.reference = messageElement.textContent
                                }
                            }
                        }
                        this._onMessage(props)
                    }

                    return true
                }))
                this._onInstalled();
                return true
            }
            return false
        }))
        return () => {
            this._onUninstalled()
            for (const clean of this._toClean) {
                clean()
            }
        }
    }

    registerOnMessage(callback) {
        this._onMessageCallbacks.push(callback)
        const result = () => {
            this._onMessageCallbacks.splice(this._onMessageCallbacks.indexOf(callback), 1)
        }
        return result
    }

    registerOnInstalled(callback) {
        this._onInstalledCallbacks.push(callback)
        const result = () => {
            this._onInstalledCallbacks.splice(this._onInstalledCallbacks.indexOf(callback), 1)
        }
        return result
    }

    registerOnUninstalled(callback) {
        this._onUninstalledCallbacks.push(callback)
        const result = () => {
            this._onUninstalledCallbacks.splice(this._onUninstalledCallbacks.indexOf(callback), 1)
        }
        return result
    }

    _onMessage(props) {
        // console.log({ ...props })
        for (const callback of this._onMessageCallbacks) {
            callback(props)
        }
    }

    _onInstalled() {
        for (const callback of this._onInstalledCallbacks) {
            callback()
        }
    }

    _onUninstalled() {
        for (const callback of this._onUninstalledCallbacks) {
            callback()
        }
    }

    addButton(icon, onClick) {
        const button = document.createElement('button')
        button.textContent = icon;
        [
            "items-center",
            "justify-center",
            "gap-2",
            "whitespace-nowrap",
            "rounded-md",
            "text-sm",
            "font-medium",
            "transition-colors",
            "focus-visible:outline-none",
            "focus-visible:ring-1",
            "focus-visible:ring-ring",
            "disabled:pointer-events-none",
            "disabled:opacity-50",
            "[&_svg]:pointer-events-none",
            "[&_svg]:size-4",
            "[&_svg]:shrink-0",
            "hover:bg-accent",
            "h-9",
            "w-9",
            "hidden",
            "sm:flex",
            "text-text-primary-medium",
            "hover:text-brand-primary",
            "cursor-pointer",
            "relative"
        ].forEach(c => button.classList.add(c))
        const titleBar = this._titleZone.children[0]
        titleBar.insertBefore(button, titleBar.children[1])
        button.addEventListener('click', onClick)
        return button;
    }
}


const addLogManagement = (laCabot) => {
    let logs = {
        idRange: null,
        day: null,
        messages: [],
        isEmpty: new HookableValue('isEmpty', true),
    }
    window.logs = logs

    const emptyLogs = () => {
        if (logs.messages.length > 0) {
            const content = logs.messages.map(m => m.messageLog).join('\n')
            console.log('Log for idRange', logs.idRange, '\n', content)
            const idRangeFilename = logs.messages[0].idRange.replaceAll(':', '-')
            const dayFilename = logs.day
            computeSha256(content, { encoding: 'utf-8' }).then((hash) => {
                const filename = `la-cale-log-${dayFilename}--${idRangeFilename}x-${hash.slice(0, 10)}.txt`
                downloadData(filename, content, { encoding: 'utf-8', mimetype: 'text/plain' })
            })
        }
        logs.messages = []
        logs.isEmpty.setValue(true)
    }
    logs.emptyLogs = emptyLogs

    laCabot.registerOnMessage((props) => {
        const idRange = props.serverDate.slice(0, 4)
        if (logs.idRange !== idRange) {
            emptyLogs()
            logs.day = props.clientDate.slice(0, 10)
            logs.idRange = idRange
        }
        let messageLog = `[${props.serverDate}] ${props.iconGrade}${props.user}: ${props.message}`
        if (props.reference) {
            messageLog += `    (> ${props.reference})`
        }
        logs.messages.push({...props, idRange, messageLog})
        logs.isEmpty.setValue(false)
    })

    laCabot.registerOnInstalled(() => {
        const buttonClean = laCabot.addButton('🧹', () => {
            emptyLogs();
        });

        window.buttonClean = buttonClean;

        logs.isEmpty.register((newValue, oldValue) => {
            buttonClean.disabled = newValue;
        });
    });

    laCabot.registerOnUninstalled(() => {
        emptyLogs();
    });
}

const main = async () => {
    let lastLocation = null
    let unistallLaCabot = null
    registerLocationChange((location) => {
        if (location.pathname === '/taverne' && location.href !== lastLocation) {
            lastLocation = location
            if (unistallLaCabot) {
                unistallLaCabot()
                unistallLaCabot = null
            }
            const laCabot = new LaCabot()
            unistallLaCabot = laCabot.install()
            laCabot.registerOnMessage((props) => {
                console.log('New message received:', props)
            })
            window.laCabot = laCabot

            laCabot.registerOnInstalled(() => {
                console.log('LaCabot installed')
            });

            addLogManagement(laCabot)
        } else if (location.pathname !== '/taverne' && unistallLaCabot) {
            unistallLaCabot()
            unistallLaCabot = null

        }
        lastLocation = location
    })
}

main()
// @main_end{la-cale-bot}

console.log(`End - ${script_id}`)
