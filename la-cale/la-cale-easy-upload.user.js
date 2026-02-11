// ==UserScript==
// @name        la-cale-easy-upload
// @namespace   https://github.com/kabertools/userscripts/
// @version     20260211-133350-c7cd940
// @description la-cale-easy-upload
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

// @imported_begin{registerEventListener}
/**
 * Wrap addEventListener and removeEventListener using a pattern where the unregister function is returned
 * 
 * @param {HTMLElement|EventTarget} element The object on which to register the event
 * @param {string} eventType The event type
 * @param {EventListenerOrEventListenerObject} callback The callback to call when the event is triggered
 * @param {boolean|AddEventListenerOptions=} options The options to pass to addEventListener
 * @return {()=>{}} The unregister function
 */
const registerEventListener = (element, eventType, callback, options) => {
    if (element.addEventListener) {
        element.addEventListener(eventType, callback, options);
        if (typeof options === 'object' && !Array.isArray(options) && options !== null) {
            if (options.executeAtRegister) {
                setTimeout(()=>callback(),0)
            }
        }
    }
    return () => {
        if (element.removeEventListener) {
            element.removeEventListener(eventType, callback, options);
        }
    }
}
// @imported_end{registerEventListener}

// @imported_begin{addStyle}
/**
 * Add a new css string to the page
 *
 * @param {string} styleText The CSS string to pass
 * @returns {void}
 */
const addStyle = (() => {
    let styleElement = null;
    let styleContent = null;

    /**
     * Add a new css string to the page
     *
     * @param {string} styleText The CSS string to pass
     * @returns {void}
     */
    return (styleText) => {
        if (styleElement === null) {
            styleElement = document.createElement('style');
            styleContent = "";
            document.head.appendChild(styleElement);
        } else {
            styleContent += "\n";
        }

        styleContent += styleText;
        styleElement.textContent = styleContent;
    };
})();
// @imported_end{addStyle}

// @imported_begin{delay}
/**
 * @param {Number} timeout The timeout in ms
 * @param {Object} data The data to return after the timeout
 * @returns 
 */
const delay = (timeout, data) =>
    new Promise((resolve) =>
        setTimeout(() =>
            resolve(data), timeout
        )
    )
// @imported_end{delay}

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
 * @param {(element: HTMLElement)=>{}} callback 
 */
const registerDomNodeMutatedUnique = (elementProvider, callback) => {
    const domNodesHandled = new Set()

    return registerDomNodeMutated(() => {
        for (let element of elementProvider()) {
            if (!domNodesHandled.has(element)) {
                domNodesHandled.add(element)
                const result = callback(element)
                if (result === false) {
                    domNodesHandled.delete(element)
                }
            }
        }
    })
}
// @imported_end{registerDomNodeMutatedUnique}

// @main_begin{la-cale-easy-upload}
const setReactElementProperty = (element, eventName, propertyName, value) => {
    const nativeElementPropertySetter =
        Object.getOwnPropertyDescriptor(
            element.__proto__,
            propertyName
        ).set;

    nativeElementPropertySetter.call(element, value);

    element.dispatchEvent(new Event(eventName, { bubbles: true }));
}
const setReactInputValue = (input, value) => setReactElementProperty(input, 'input', 'value', value)
const setReactTextareaValue = (textarea, value) => setReactElementProperty(textarea, 'input', 'value', value)
const setReactInputFiles = (input, files) => setReactElementProperty(input, 'change', 'files', files)

const fileToFileList = (file) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    return dataTransfer.files;
}

const uninstallers = [];

const addUninstaller = (uninstaller) => {
    uninstallers.push(uninstaller);
}

const uninstallAll = () => {
    uninstallers.forEach((uninstaller) => uninstaller());
    uninstallers.length = 0;
}

const getPrezContent = async (prezButton, prezZone) => {
    let prezTextarea = getSubElements(prezZone, 'textarea')[0]
    if (!prezTextarea) {
        prezButton.click();
        await delay(0);
        prezTextarea = getSubElements(prezZone, 'textarea')[0]
        if (!prezTextarea) {
            throw new Error(`Impossible de trouver la textarea de présentation`);
        }
    }
    return prezTextarea;
}

const showPrezContent = async (prezButton, prezZone) => {
    let prezTextarea = getSubElements(prezZone, 'textarea')[0]
    if (prezTextarea) {
        prezButton.click();
        await delay(0);
    }
}

const installEasyUpload = async () => {
    const dropElements = getElements('.p-6.pt-6');
    if (dropElements.length !== 2) {
        throw new Error(`Impossible de trouver les éléments de drop (trouvé ${dropElements.length} éléments, attendu 2)`);
    }
    const dropElement = dropElements[0];

    const spacey2s = getElements('div.space-y-2');
    if (spacey2s.length !== 8) {
        throw new Error(`Impossible de trouver les éléments de space (trouvé ${spacey2s.length} éléments, attendu 8)`);
    }
    const quaiZone = spacey2s[2]
    const emplacementZone = spacey2s[3]
    const titreZone = spacey2s[6]
    const prezZone = spacey2s[7]

    console.log({ quaiZone, emplacementZone, titreZone, prezZone })

    const prezButton = getSubElements(prezZone, 'button')[0]

    if (!prezButton) {
        throw new Error(`Impossible de trouver le bouton de présentation`);
    }

    let prezTextarea = await getPrezContent(prezButton, prezZone);

    const titreInput = getSubElements(titreZone, 'input')[0]

    console.log({ prezButton, prezTextarea, titreInput })

    const inputFiles = [...document.querySelectorAll('input[type=file]')]
    if (inputFiles.length !== 2) {
        throw new Error(`Impossible de trouver les champs de fichier (trouvé ${inputFiles.length} éléments, attendu 2)`);
    }
    const [inputFileTorrent, inputFileNfo] = inputFiles;

    const eventNames = ['dragenter', 'dragover', 'dragleave', 'drop'];
    const actionsByEventName = {
        dragenter: (element, eventName) => element.classList.add('x-dragover'),
        dragover: (element, eventName) => element.classList.add('x-dragover'),
        dragleave: (element, eventName) => element.classList.remove('x-dragover'),
        drop: async (element, eventName, event) => {
            element.classList.remove('x-dragover')
            if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                const fileCount = event.dataTransfer.files.length;
                console.log(`Fichiers déposés : ${fileCount}`);
                let prezFile = null;
                let tagsFile = null;
                for (let i = 0; i < fileCount; i++) {
                    console.log(`Fichiers déposés : ${fileCount} (${i + 1}/${fileCount})`);
                    const filename = event.dataTransfer.files[i].name;
                    console.log(`Fichier déposé : ${filename}`);
                    if (filename.endsWith('.nfo')) {
                        setReactInputFiles(inputFileNfo, fileToFileList(event.dataTransfer.files[i]));
                    } else if (filename.endsWith('.torrent')) {
                        setReactInputFiles(inputFileTorrent, fileToFileList(event.dataTransfer.files[i]));
                    } else if (filename.endsWith('.prez')) {
                        prezFile = event.dataTransfer.files[i];
                        const basename = filename.substring(0, filename.length - '.prez'.length);
                        setReactInputValue(titreInput, basename);
                    } else if (filename.endsWith('.tags')) {
                        tagsFile = event.dataTransfer.files[i];
                    }
                }
                if (prezFile !== null) {
                    const prezContent = await prezFile.text();
                    prezTextarea = await getPrezContent(prezButton, prezZone);
                    setReactTextareaValue(prezTextarea, prezContent);
                    await showPrezContent(prezButton, prezZone);
                }
                if (tagsFile !== null) {
                    const tagsContent = await tagsFile.text();
                    console.log(`Contenu du fichier .tags : ${tagsContent}`);
                    const tags = tagsContent.split('\n').map(tag => tag.trim())
                    console.log({ tags });

                    if (tags.length > 2) {
                        getSubElements(quaiZone, 'button')[0].click()
                        await delay(0)
                        let options = getElements('[data-radix-popper-content-wrapper] [role=option]')
                        options.filter(x => x.textContent === tags[0])[0].dispatchEvent(new Event('click', { bubbles: true }))
                        await delay(0)
                        getSubElements(emplacementZone, 'button')[0].click()
                        await delay(0)
                        options = getElements('[data-radix-popper-content-wrapper] [role=option]')
                        options.filter(x => x.textContent === tags[1])[0].dispatchEvent(new Event('click', { bubbles: true }))
                        await delay(0)
                        const groupButtons = getElements('.group.cursor-pointer')
                        groupButtons.filter(x => tags.slice(2).map(x => x.toLocaleUpperCase()).indexOf(x.textContent.toLocaleUpperCase()) >= 0).forEach(x => x.click())
                    }

                    // quaiZone.querySelectorAll('button')[0].click()
                    // opts = [...[...document.querySelectorAll('[data-radix-popper-content-wrapper]')][0].querySelectorAll('[role=option]')]
                    // opts.filter(x=>x.textContent === 'E-books')[0].dispatchEvent(new Event('click',{bubbles:true}))
                    // emplacementZone.querySelectorAll('button')[0].click()
                    // opts = [...[...document.querySelectorAll('[data-radix-popper-content-wrapper]')][0].querySelectorAll('[role=option]')]
                    // opts.filter(x=>x.textContent === 'Presse')[0].dispatchEvent(new Event('click',{bubbles:true}))
                    // [...document.querySelectorAll('.group.cursor-pointer')].filter(x=>['Actualités', 'Journaux','Français','CBZ'].indexOf(x.textContent)>=0).forEach(x=>x.click())
                }
            }
        },
    }

    eventNames.forEach((eventName) => {
        const unreg = registerEventListener(dropElement, eventName, (event) => {
            // console.log(`Event ${eventName} déclenché`);
            event.preventDefault();
            event.stopPropagation();
            actionsByEventName[eventName](dropElement, eventName, event);
        });
        addUninstaller(unreg);
    });

}

const main = () => {
    addStyle(`.x-dragover { background-color: rgba(255, 0, 0, 0.3) !important; }`);
    registerLocationChange((currentLocation) => {
        if (currentLocation.pathname === '/upload') {
            try {
                installEasyUpload();
            } catch (error) {
                alert(`Une erreur est survenue : ${error.message}`);
            }

        } else {
            uninstallAll();
        }
    });
}

main()
// @main_end{la-cale-easy-upload}

console.log(`End - ${script_id}`)
