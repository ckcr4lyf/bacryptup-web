const axios = require('axios');
const crypto = require('crypto');
// const ENDPOINT = "http://localhost:3000/v1/";
const ENDPOINT = "https://bacryptup.saxrag.com/v1/";

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

    if (id == "" || password == ""){
        dlstatus.innerText = "Missing parameters...";
        return;
    }

    var downloadSpin = setInterval(downloadMsg, 250);


    axios.get(ENDPOINT + "file/" + id).then((response) => {
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
            clearInterval(downloadSpin);
            dlstatus.innerText = "Decrypting...";

            try {
                dbufs.push(decipher.update(enc_buffer));
                dbufs.push(decipher.final());
                decrypted = Buffer.concat(dbufs);
            } catch (err) {
                dlstatus.innerText = "Decryption failed";
                return;
            }

            var blob = new Blob([decrypted]);
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
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
    // var upload_limit = 1024 * 1024 * 150;
    var uploadSpin;
    var encryptSpin;

    function encryptMsg() {
        var msg = "Encrypting " + spinner[count % 4];
        count++;
        statusEl.innerText = msg;
        console.log("In encrypt interval - msg", msg);
    }

    function uploadMsg() {
        var msg = "Uploading " + spinner[count % 4];
        count++;
        statusEl.innerText = msg;
    }

    if (!inputFile) {
        statusEl.innerText = "No file.";
        return;
    }

    if (anon != true && (!accessToken || accessToken == "")) {
        statusEl.innerText = "No access token."
        return;
    }

    if (!password || password == "") {
        statusEl.innerText = "No password."
        return;
    }

    fileReader.onloadstart = () => {
        statusEl.innerHTML = "Encrypting..."
    }

    fileReader.onload = () => {
        let key = crypto.pbkdf2Sync(password, "BACRYPTUP", 1000, 32, 'sha256');
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let plaintext = new Uint8Array(fileReader.result);

        if (anon == true && plaintext.length > tenmb){
            statusEl.innerHTML = "Size limit exceeded.";
            return;
        } else if (plaintext.length > tenmb * 10){
            statusEl.innerHTML = "Size limit exceeded.";
            return;
        }

        encryptSpin = setInterval(encryptMsg, 250);
        let segments = [];
        segments.push(cipher.update(plaintext));
        segments.push(cipher.final());
        let ciphertext = Buffer.concat(segments);
        clearInterval(encryptSpin);
        uploadSpin = setInterval(uploadMsg, 250);
        let onehour = 1000 * 60 * 60; //1hr
        let dtime = onehour;

        if (document.querySelector("#day").checked == true){
            dtime = onehour * 24;
        }

        let headers = {
            'content-type': 'application/octet-stream',
            'filename': inputFile.name,
            'x-iv': iv.toString('base64'),
            "x-original-size": ciphertext.length,
            'x-expiry': dtime.toString()
        }

        if (anon != true){
            headers['x-access-token'] = accessToken;
        }

        axios({
            url: ENDPOINT + "stream/",
            method: 'post',
            headers: headers,
            data: ciphertext
        }).then((response) => {

            clearInterval(uploadSpin);
            if (response.status == 201) {
                let fileId = response.data.fileId;
                let message = "Upload Complete. File ID: " + fileId;
                statusEl.innerText = message;
                getQuota();
            } else {
                statusEl.innerText = "Upload failed. Code " + response.status;
            }
        }).catch((error) => {
            clearInterval(uploadSpin);
            if (error.response){
                statusEl.innerText = "Upload failed. Code " + error.response.status;
            } else {
                statusEl.innerText = "Upload failed. The server did not respond.";
            }
        })
    }

    //Thanks to shdv of hat.sh for the help on frontend file buffering! I'm more of a server side guy 
    fileReader.readAsArrayBuffer(inputFile);
}

var fileEl = document.getElementById('theFile');
var fileText = document.getElementById('fileText');

fileEl.oninput = (ev) => {
    let fname = fileEl.files[0].name;

    if (fname.length > 20){
        fname = fname.slice(0, 17) + "...";
    }

    fileText.innerText = fname;
}

let getQuota = () => {
    axios.get(ENDPOINT + "quota").then((response) => {
        if (response.status == 200){
            var anonAvail = response.data.anonAvail / (1024 * 1024);
            anonAvail = anonAvail.toFixed(2);
            var userAvail = response.data.userAvail / (1024 * 1024);
            userAvail = userAvail.toFixed(2);
            document.querySelector("#anonAvail").innerHTML = anonAvail.toString() + " MB";
            document.querySelector("#userAvail").innerHTML = userAvail.toString() + " MB";
        } else {
            document.querySelector("#anonAvail").innerHTML = "error";
            document.querySelector("#userAvail").innerHTML = "error";
        }
    }).catch(err => {
        document.querySelector("#anonAvail").innerHTML = "error";
        document.querySelector("#userAvail").innerHTML = "error";
    });
}

let deleteFile = () => {

    let accessToken = document.querySelector("#delat");
    let fileID = document.querySelector("#delid");
    let delspan = document.querySelector("#delres");

    if (accessToken.value == "" || fileID.value == ""){
        delspan.innerHTML = "Missing parameters...";
        return;
    }

    delspan.innerHTML = "Deleting...";

    headers = {
        'x-access-token': accessToken.value
    };

    axios({
        url: ENDPOINT + 'file/' + fileID.value,
        method: 'delete',
        headers: headers
    }).then(response => {
        if (response.status == 204){
            delspan.innerHTML = "Deleted.";
        } else {
            delspan.innerHTML = "Error occured when deleting."
        }
    }).catch(error => {
        if (error.response){
            delspan.innerHTML = "Failed to delete. Error code " + error.response.status;
        } else {
            delspan.innerHTML = "Failed to delete. The server did not respond";
        }
    });
}

window.deleteFile = deleteFile;
window.getQuota = getQuota;
window.dlfile = dlfile;
window.encryptFile = encryptFile;