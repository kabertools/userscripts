// @import{registerLocationChange}
// @import{getSubElements}
// @import{getElements}
// @import{registerEventListener}
// @import{addStyle}
// @import{delay}
// @import{registerDomNodeMutatedUnique}
// @import{RegistrationManager}

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

const getPrezContent = async (prezButton, prezZone) => {
    prezButton.click();
    await delay(0)
    let prezTextarea = getSubElements(prezZone, 'textarea')[0]
    if (!prezTextarea) {
        await delay(1000);
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

const registrationManager = new RegistrationManager()

const installEasyUpload = async () => {
    registerDomNodeMutatedUnique(
        () => getElements('.p-6.pt-6'),
        async (dropElement, { indexElement }) => {
            if (indexElement === 0) {
                const spacey2s = getElements('div.space-y-2');
                if (spacey2s.length !== 8) {
                    throw new Error(`Impossible de trouver les éléments de space (trouvé ${spacey2s.length} éléments, attendu 8)`);
                }
                const quaiZone = spacey2s[2]
                const emplacementZone = spacey2s[3]
                const titreZone = spacey2s[6]
                const prezZone = spacey2s[7]

                console.log({ quaiZone, emplacementZone, titreZone, prezZone })

                const prezButtons = getSubElements(prezZone, '.flex.items-center.gap-1 > button')
                if (prezButtons.length !== 4) {
                    throw new Error(`Impossible de trouver les boutons de prez (trouvé ${prezButtons.length} éléments, attendu 4)`);
                }
                const prezButton = prezButtons[1]

                if (!prezButton) {
                    throw new Error(`Impossible de trouver le bouton de présentation`);
                }

                const prezShowContentButton = prezButtons[3]

                if (!prezShowContentButton) {
                    throw new Error(`Impossible de trouver le bouton d'affichage de la présentation`);
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
                                await showPrezContent(prezShowContentButton, prezZone);
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
                                    const groupButtonsToDisable = getElements('.group.cursor-pointer.border-brand-primary')
                                    groupButtonsToDisable.forEach(x => x.click())
                                    const groupButtons = getElements('.group.cursor-pointer')
                                    groupButtons.filter(x => tags.slice(2).map(x => x.toLocaleUpperCase()).indexOf(x.textContent.toLocaleUpperCase()) >= 0).forEach(x => x.click())
                                }
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
                    registrationManager.onRegistration(unreg);
                });
            }
        }
    )
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
            registrationManager.cleanupAll();
        }
    });
}

main()
