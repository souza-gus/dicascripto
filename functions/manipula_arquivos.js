const fs = require('fs');

const convertFileToBase64 = (filePath) => {
    return fs.readFileSync(filePath, { encoding: 'base64' });
};

module.exports = {
    convertFileToBase64
}