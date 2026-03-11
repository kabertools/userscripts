// @import{getElements}
// @import{getSubElements}
// @import{registerDomNodeMutatedUnique}
// @import{registerLocationChange}
// @import{RegistrationManager}
// @import{monkeyGetSetValue}

const categoriesToChangeVertical = monkeyGetSetValue('categoriesToChangeVertical', ['BD','Comics','Divers','Livres','Mangas','Presse'])
const categoriesToChangeSquare = monkeyGetSetValue('categoriesToChangeSquare', ['BD','Comics','Divers','Livres','Mangas','Presse'])

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
