// @import{registerDomNodeMutated}
/**
 * Call the callback once per element provided by the elementProvider when the document change
 * Handle the fact that the callback can't be called while aleady being called (no stackoverflow). 
 * Use the register pattern thus return the unregister function as a result
 * 
 * Ensure that when an element matching the query elementProvider, the callback is called with the element 
 * exactly once for each element
 * @param {()=>[HTMLElement]} elementProvider 
 * @param {(element: HTMLElement, index: number)=>{}} callback 
 */
const registerDomNodeMutatedUnique = (elementProvider, callback) => {
    const domNodesHandled = new Set()

    return registerDomNodeMutated(() => {
        let index = 0
        for (let element of elementProvider()) {
            if (!domNodesHandled.has(element)) {
                domNodesHandled.add(element)
                const result = callback(element, index)
                if (result === false) {
                    domNodesHandled.delete(element)
                }
            }
            index++;
        }
    })
}
