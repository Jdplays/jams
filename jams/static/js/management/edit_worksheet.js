var VersionId = null

function getFile() {
  let url = `/backend/workshops/${workshopId}/files/${fileUUID}`
    if (VersionId != null) {
      url += `?version_id=${VersionId}`
    }
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      type: "GET",
      xhrFields: {
        responseType: 'blob' // Expect binary data
      },
      success: function (data, textStatus, jqXHR) {
        const mimeType = jqXHR.getResponseHeader("Content-Type");
        resolve({data, mimeType});
      },
      error: function (error) {
        console.log("Error fetching data:", error);
        reject(error);
      },
    });
  });
}

function getFileData() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/backend/workshops/${workshopId}/files/${fileUUID}/data`,
      type: "GET",
      success: function (response) {
        resolve(response);
      },
      error: function (error) {
        console.log("Error fetching data:", error);
        reject(error);
      },
    });
  });
}

function editFileData(data) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/backend/workshops/${workshopId}/files/${fileUUID}/data`,
      type: "PATCH",
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function (response) {
        resolve(response);
      },
      error: function (error) {
        console.log("Error fetching data:", error);
        reject(error);
      },
    });
  });
}

function getFileVersions() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/backend/workshops/${workshopId}/files/${fileUUID}/versions`,
      type: "GET",
      success: function (response) {
        resolve(response.file_versions);
      },
      error: function (error) {
        console.log("Error fetching data:", error);
        reject(error);
      },
    });
  });
}

function getWorkshopName() {
  return new Promise((resolve, reject) => {
      $.ajax({
          url: `/backend/workshops/${workshopId}/name`,
          type: 'GET',
          success: function(response) {
              resolve(response);  
          },
          error: function(error) {
              console.log('Error fetching data:', error);
              reject(error)
          }
      });
  });
}

function uploadFileToWorkshop(fileData) {
  return new Promise((resolve, reject) => {
    $.ajax({
      type: "POST",
      url: `/backend/workshops/${workshopId}/worksheet`,
      data: fileData,
      processData: false,
      contentType: false,
      success: function (response) {
        document.getElementById('tool-bar-upload-response').innerHTML = response.message
        resolve(response);
      },
      error: function (error) {
        console.log("Error fetching data:", error);
        document.getElementById('tool-bar-upload-response').innerHTML = error
        reject(error);
      },
    });
  });
}

function uploadFileInputOnChange() {
  let input = document.getElementById('tool-bar-upload-file-input')
  file = input.files[0]

  let button = document.getElementById('tool-bar-upload-file-button')
  if(file) {
    button.disabled = false
  }
  else {
    button.disabled = true
  }
}


async function uploadFileButtonOnClick() {
  let input = document.getElementById('tool-bar-upload-file-input')

  file = input.files[0]
  fileType = file.name.split('.').pop().toLowerCase()
  if (fileType != 'md' && fileType != 'pdf') {
    document.getElementById('tool-bar-upload-response').innerHTML = 'Invalid File type selected!'
    return
  }

  const newFileName = `worksheet.${fileType}`
  const newFile = new File([file], newFileName, { type: file.type })
  var fileData = new FormData();
  fileData.append('file', newFile);

  uploadFileToWorkshop(fileData).then(response => {
    initialisePage()
  })
  
}

function versionDropdownOnChange(version) {
  VersionId = version
  initialisePage()
}

async function restoreButtonOnClick() {
  data = {
    'current_version_id': VersionId
  }

  await editFileData(data).then(response => {
    initialisePage()
  })
}

async function saveButtonOnClick() {
  let content = tinyMCE.activeEditor.getContent({format: 'markdown'})
  const turndownService = new TurndownService()
  const markdownContent = turndownService.turndown(content)

  // Create a Blob from the markdown content
  const blob = new Blob([markdownContent], { type: 'text/markdown' })

  const fileData = new FormData()
  fileData.append('file', blob, 'worksheet.md')

  await uploadFileToWorkshop(fileData).then(response => {
    VersionId = response.file.current_version_id
    initialisePage()
  })
}

async function initialisePage() {
  populateToolBar()

  const fileContainer = document.getElementById("file-container");
  fileContainer.style.height = `${window.innerHeight * 0.8}px`;
  fileContainer.style.width = `100%`;

  // Get the file passed in
  let response = await getFile(fileUUID);

  let fileData = response.data
  let fileMimeType = response.mimeType

  EmptyElement(fileContainer)

  displayFile(fileContainer, fileData, fileMimeType)
}

function displayFile(fileContainer, fileData, mimeType) {
    const blob = new Blob([fileData], {type: mimeType});
    const url = URL.createObjectURL(blob)

    let element;
    if (mimeType.startsWith('text/')) {
        const reader = new FileReader();

        reader.onload = function (e) {
            // Read the file as text
            const markdownText = e.target.result;

            initialiseTinyMCE(fileContainer, markdownText);
        };

        reader.readAsText(blob);
        return;
    }
    else if (mimeType.startsWith('image/')) {
        element = document.createElement('img')
        element.src = url
    } else if (mimeType === 'application/pdf') {
        element = document.createElement('iframe')
        element.src = url
        element.width = '100%'
        element.height = '100%'
    } else if (mimeType === 'application/json') {
        element = document.createElement('pre')
        element.textContent = fileData;
    } else {
        element = document.createElement('a')
        element.href = url
        element.download = 'download'
        element.textContent = 'Download file'
    }

    fileContainer.appendChild(element)
}

function initialiseTinyMCE(fileContainer, fileData) {
    const tinymceTextArea = document.createElement("textarea");
    tinymceTextArea.id = "tinymce-text-area";
    const htmlContent = marked.parse(fileData)
    tinymceTextArea.innerHTML = htmlContent

    fileContainer.appendChild(tinymceTextArea)

    let tinymceOptions = {
        selector: "#tinymce-text-area",
        height: "100%",
        width: "100%",
        resize: false,
        menubar: false,
        statusbar: false,
        plugins: [
        "advlist",
        "autolink",
        "lists",
        "link",
        "image",
        "charmap",
        "preview",
        "anchor",
        "searchreplace",
        "visualblocks",
        "code",
        "fullscreen",
        "insertdatetime",
        "media",
        "table",
        "code",
        "help",
        "wordcount",
        "autosave"
        ],
        toolbar:
        "undo redo | formatselect | " +
        "bold italic backcolor | alignleft aligncenter " +
        "alignright alignjustify | bullist numlist outdent indent | " +
        "removeformat | save",
        content_style:
        "body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; }",
        setup: (editor) => {
          editor.on('Dirty', (e) => {
            let saveButton = document.getElementById('tool-bar-save-file')
            saveButton.disabled = false
          })
        }
    };

    if (localStorage.getItem("theme") === "dark") {
        tinymceOptions.skin = "oxide-dark";
        tinymceOptions.content_css = "dark";
    }

    tinyMCE.init(tinymceOptions);
}

async function populateToolBar() {
  let fileData = await getFileData()
  let fileVersions = await getFileVersions()
  let workshopData = await getWorkshopName()

  const infoCol = document.getElementById('tool-bar-col-1')
  const versionCol = document.getElementById('tool-bar-col-2')
  const actionsCol = document.getElementById('tool-bar-col-3')

  // Info Column
  infoCol.width = '40%'
  let title = document.getElementById('tool-bar-title')
  title.innerHTML = `${workshopData.name} - Worksheet`

  let uploadInput = document.getElementById('tool-bar-upload-file-input')
  uploadInput.value = ''

  let uploadButton = document.getElementById('tool-bar-upload-file-button')
  uploadButton.disabled = true

  // Version Column
  versionCol.width = '40%'

  let versionDropdown = document.getElementById('version-dropdown')
  EmptyElement(versionDropdown)

  let selectedVersionHeader = document.createElement('span')
  selectedVersionHeader.classList.add('dropdown-header')
  selectedVersionHeader.innerHTML = 'Selected Version'
  versionDropdown.appendChild(selectedVersionHeader)

  let defaultVersionOption = document.createElement('a')
  defaultVersionOption.classList.add('dropdown-item')
  defaultVersionOption.disabled = true
  if (VersionId == null) {
    defaultVersionOption.innerHTML = `${fileData.current_version_id} (Current Version)`
  }
  else {
    if (VersionId == fileData.current_version_id) {
      defaultVersionOption.innerHTML = `${VersionId} (Current Version)`
    }
  }
  versionDropdown.appendChild(defaultVersionOption)

  let dropdownDivider = document.createElement('div')
  dropdownDivider.classList.add('dropdown-divider')
  versionDropdown.appendChild(dropdownDivider)

  for (const version of fileVersions) {
    let versionOption = document.createElement('a')
    versionOption.classList.add('dropdown-item')
    if (version.version_id == fileData.current_version_id) {
      if (VersionId != fileData.current_version_id && VersionId != null) {
        versionOption.innerHTML = `${version.version_id} (Current Version)`
      }
      else {
        continue
      }
    }
    else {
      versionOption.innerHTML = version.version_id
    }

    versionOption.onclick = function (){
      versionDropdownOnChange(version.version_id)
    }

    versionDropdown.appendChild(versionOption)
  }


  // Restore Column
  actionsCol.width = '20%'
  let restoreButton = document.getElementById('tool-bar-restore-file')
  restoreButton.disabled = true
  if (VersionId != null && VersionId != fileData.current_version_id) {
    restoreButton.disabled = false
  }

  let saveButton = document.getElementById('tool-bar-save-file')
  saveButton.disabled = true
  
}

// Empties all children from a html element
function EmptyElement(element) {
  while (element.firstChild) {
      element.removeChild(element.firstChild)
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialisePage);
