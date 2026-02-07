// @import{getElements}
// @import{getSubElements}
// @import{registerDomNodeMutated}
// @import{registerDomNodeMutatedUnique}
// @import{downloadData}
// @import{HookableValue}
// @import{computeSha256}
// @import{registerLocationChange}

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
                            if (messageElement) {
                                props.message = messageElement.textContent
                                props.messageElement = messageElement
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
            console.log('Log for idRange', logs.idRange, '\n', logs.messages.join('\n'))
            const content = logs.messages.join('\n')
            computeSha256(content, { encoding: 'utf-8' }).then((hash) => {
                downloadData(`la-cale-log-${logs.day}--${logs.idRange.replaceAll(':', '-')}x-${hash.slice(0, 10)}.txt`, content, { encoding: 'utf-8', mimetype: 'text/plain' })
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
        logs.messages.push(`[${props.serverDate}] ${props.iconGrade}${props.user}: ${props.message}`)
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