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
