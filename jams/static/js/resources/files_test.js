function GetFiles() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/files',
            type: 'GET',
            success: function(response) {
                resolve(response.files);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function UploadFile(formData) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/files',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                resolve(response.files);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

// Empties all children from a html element
function EmptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

function UploadFileOnClick() {
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];

    if (!file) {
        document.getElementById('status').innerText = "No file selected.";
        return;
    }

    var formData = new FormData();
    formData.append('file', file);

    UploadFile(formData).then(response => {
        document.getElementById('files-request-response').innerText = "File uploaded successfully!";
        PopulateFileList()
    }).catch(error => {
        document.getElementById('files-request-response').innerText = "File upload failed.";
        console.error('Error uploading file:', error);
    });
}

async function PopulateFileList() {
    let fileList = document.getElementById('file-list')
    let files = await GetFiles()

    EmptyElement(fileList)
    for (const file of files) {
        let fileData = document.createElement('a')
        fileData.innerHTML = file.name
        fileData.href = `/resources/${file.id}/edit`
        fileData.style.padding = '5px'
        fileList.appendChild(fileData)
    }
}



document.addEventListener("DOMContentLoaded", PopulateFileList);