const axios = require('axios');
const crypto = require('crypto');

let dlfile = () => {
    var id = document.getElementById('fileId').value;
    var password = document.getElementById('password').value;
    var dlstatus = document.getElementById("status-dl");
    var spinner = ['/', '-', '\\', '|'];
    var count = 0;
    const algo = "aes-256-cbc";

    function downloadMsg() {
        var msg = "Downloading " + spinner[count % 4];
        count++;
        dlstatus.innerText = msg;
    }

    var downloadSpin = setInterval(downloadMsg, 250);


    axios.get("https://bacryptup.saxrag.com/v1/file/" + id).then((response) => {
        let key = crypto.pbkdf2Sync(password, "BACRYPTUP", 1000, 32, 'sha256');
        let iv_base64 = response.data.doc.iv;
        let iv = Buffer.from(iv_base64, 'base64');
        let fileName = response.data.doc.original_name;
        let decipher = crypto.createDecipheriv(algo, key, iv);
        let s3_url = response.data.url;

        axios({
            url: s3_url,
            responseType: 'arraybuffer'
        }).then(response => {


            let enc_buffer = Buffer.from(response.data);
            let dbufs = [];
            let decrypted = null;

            try {
                dbufs.push(decipher.update(enc_buffer));
                dbufs.push(decipher.final());
                decrypted = Buffer.concat(dbufs);
            } catch (err) {
                clearInterval(downloadSpin);
                dlstatus.innerText = "Decryption failed";
                return;
            }

            var blob = new Blob([decrypted]);
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            clearInterval(downloadSpin);
            dlstatus.innerText = "";

        }).catch(error => {
            clearInterval(downloadSpin);
            dlstatus.innerText = "Download error. Code: " + error.response.status;
        })
    }).catch(error => {
        clearInterval(downloadSpin);
        dlstatus.innerText = "Download error. Code: " + error.response.status;
    });
}

let encryptFile = () => {
    let inputFile = document.getElementById('theFile').files[0];
    let accessToken = document.getElementById('accessToken').value;
    let password = document.getElementById('password-enc').value;
    let fileReader = new FileReader();
    var statusEl = document.getElementById("status");
    var spinner = ['/', '-', '\\', '|'];
    var count = 0;
    var upload_limit = 1024 * 1024 * 10;

    if (!inputFile) {
        statusEl.innerText = "No file.";
    }

    if (!accessToken || accessToken == "") {
        statusEl.innerText = "No access token."
    }

    if (!password || password == "") {
        statusEl.innerText = "No password."
    }

    if (inputFile.size > upload_limit) {
        statusEl.innerText = "File too large.";
        return;
    }

    function uploadMsg() {
        var msg = "Uploading " + spinner[count % 4];
        count++;
        statusEl.innerText = msg;
    }

    var uploadSpin = setInterval(uploadMsg, 250);

    fileReader.onloadstart = () => {
        console.log("Starting to load file...");
    }

    fileReader.onload = () => {
        let key = crypto.pbkdf2Sync(password, "BACRYPTUP", 1000, 32, 'sha256');
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let plaintext = new Uint8Array(fileReader.result);
        let segments = [];
        segments.push(cipher.update(plaintext));
        segments.push(cipher.final());
        let ciphertext = Buffer.concat(segments);

        axios({
            url: "https://bacryptup.saxrag.com/v1/stream/",
            method: 'post',
            headers: {
                'content-type': 'application/octet-stream',
                'filename': inputFile.name,
                'x-access-token': accessToken,
                'x-iv': iv.toString('base64')
            },
            data: ciphertext
        }).then((response) => {

            clearInterval(uploadSpin);
            if (response.status == 201) {
                let fileId = response.data.fileId;
                let message = "Upload Complete. File ID: " + fileId;
                statusEl.innerText = message;
            } else {
                statusEl.innerText = "Upload failed. Code " + response.status;
            }
        }).catch((error) => {
            clearInterval(uploadSpin);
            statusEl.innerText = "Upload failed. Code " + error.response.status;
        })
    }

    fileReader.readAsArrayBuffer(inputFile);
}

var fileEl = document.getElementById('theFile');
var fileText = document.getElementById('fileText');

fileEl.oninput = (ev) => {
    fileText.innerText = fileEl.files[0].name;
}

window.dlfile = dlfile;
window.encryptFile = encryptFile;