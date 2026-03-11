// @import{getElements}
// @import{getSubElements}
// @import{registerDomNodeMutatedUnique}
// @import{registerLocationChange}
// @import{RegistrationManager}

const main = async () => {
    const registrationManager = new RegistrationManager()
    registerLocationChange((location) => {
        registrationManager.cleanupAll()

        if (location.pathname === '/taverne') {
            registrationManager.onRegistration(registerDomNodeMutatedUnique(
                () => getElements('.flex-1.overflow-hidden'),
                (node) => {
                    const userMessages = getSubElements(node, '[href="/profile/Musardine"]')
                    if (userMessages.length > 0) {
                        console.log({ userMessages })
                        const nameElement = getSubElements(userMessages[0], 'span')[0]
                        if (nameElement) {
                            nameElement.style.color = 'rgb(223,42,132)'
                            const nextSibling = userMessages[0]?.nextElementSibling?.nextElementSibling
                            if (nextSibling) {
                                nextSibling.style.color = 'rgb(223,42,132)'
                                nextSibling.style.borderColor = 'rgb(223,42,132,0.45)'
                                nextSibling.style.backgroundColor = 'rgb(223,42,132,0.12)'
                            }
                        }
                    }
                }
            ))
        }
    })
}

main()