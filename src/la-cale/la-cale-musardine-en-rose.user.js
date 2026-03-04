// @import{getElements}
// @import{getSubElements}
// @import{registerDomNodeMutatedUnique}
// @import{registerLocationChange}

const main = async () => {
    registerLocationChange((location) => {
        if (location.pathname === '/taverne') {
            registerDomNodeMutatedUnique(() => getElements('.flex-1.overflow-hidden'), (node) => {
                const userMessages = getSubElements(node, '[href="/profile/Musardine"]')
                if (userMessages.length > 0) {
                    console.log({ userMessages })
                    getSubElements(userMessages[0], 'span')[0].style.color = 'rgb(223,42,132)'
                    const nextSibling = userMessages[0]?.nextElementSibling
                    if (nextSibling) {
                        nextSibling.style.color = 'rgb(223,42,132)'
                        nextSibling.style.borderColor = 'rgb(223,42,132,0.45)'
                        nextSibling.style.backgroundColor = 'rgb(223,42,132,0.12)'
                    }
                }
            })
        }
    })
}

main()