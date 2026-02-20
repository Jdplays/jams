import {
    getFile,
    getWorkshopFileData,
    editFileData,
    getFileVersions,
    getWorkshopField,
    uploadFileToWorkshop
} from "@global/endpoints";
import { FileData } from "@global/endpoints_interfaces";
import { emptyElement, isDefined } from "@global/helper";
import tinymce, { Editor } from 'tinymce';
import TurndownService from 'turndown';
import { marked } from 'marked';

var VersionId:string|null = null
let WorkshopId:number
let FileUUID:string

function uploadFileInputOnChange() {
  const input = document.getElementById('tool-bar-upload-file-input') as HTMLInputElement
  const file = input.files[0]

  const button = document.getElementById('tool-bar-upload-file-button') as HTMLButtonElement
  if(file) {
    button.disabled = false
  }
  else {
    button.disabled = true
  }
}


async function uploadFileButtonOnClick() {
  const input = document.getElementById('tool-bar-upload-file-input') as HTMLInputElement

  const file = input.files[0]
  const fileType = file.name.split('.').pop().toLowerCase()
  if (fileType != 'md' && fileType != 'pdf') {
    document.getElementById('tool-bar-upload-response').innerHTML = 'Invalid File type selected!'
    return
  }

  const newFileName = `worksheet.${fileType}`
  const newFile = new File([file], newFileName, { type: file.type })
  var fileData = new FormData();
  fileData.append('file', newFile);

  uploadFileToWorkshop(WorkshopId, fileData).then(response => {
    initialisePage()
  })
  
}

function versionDropdownOnChange(version:string) {
  VersionId = version
  initialisePage()
}

async function restoreButtonOnClick() {
  const data:Partial<FileData> = {
    'current_version_id': VersionId
  }

  await editFileData(WorkshopId, FileUUID, data).then(response => {
    initialisePage()
  })
}

async function saveButtonOnClick() {
    const content: string = tinymce.activeEditor.getContent({ format: 'html' });
    const turndownService = new TurndownService()
    const markdownContent: string = turndownService.turndown(content);

    // Create a Blob from the markdown content
    const blob = new Blob([markdownContent], { type: 'text/markdown' })

    const fileData = new FormData()
    fileData.append('file', blob, 'worksheet.md')

    await uploadFileToWorkshop(WorkshopId, fileData).then(response => {
        VersionId = response.current_version_id
        initialisePage()
    })
}

async function initialisePage() {
  populateToolBar()

  const fileContainer = document.getElementById("file-container");
  fileContainer.style.height = `${window.innerHeight * 0.8}px`;
  fileContainer.style.width = `100%`;

  // Get the file passed in
  let queryString:string|null = null;
  if (VersionId != null) {
    queryString = `version_id=${VersionId}`
  }
  let response = await getFile(FileUUID, queryString);

  let fileData = response.data
  let fileMimeType = response.mimeType

  emptyElement(fileContainer)

  displayFile(fileContainer, fileData, fileMimeType)
}

function displayFile(fileContainer:HTMLElement, fileData:Blob, mimeType:string) {
    const blob = new Blob([fileData], {type: mimeType});
    const url = URL.createObjectURL(blob)

    let element;
    if (mimeType.startsWith('text/')) {
        const reader = new FileReader();

        reader.onload = function (e) {
            // Read the file as text
            const markdownText = String(e.target.result);

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
        element.textContent = String(fileData);
    } else {
        element = document.createElement('a')
        element.href = url
        element.download = 'download'
        element.textContent = 'Download file'
    }

    fileContainer.appendChild(element)
}

async function initialiseTinyMCE(fileContainer:HTMLElement, fileData:string) {
    const tinymceTextArea = document.createElement("textarea");
    tinymceTextArea.id = "tinymce-text-area";
    const htmlContent = await marked.parse(fileData)
    tinymceTextArea.innerHTML = htmlContent

    fileContainer.appendChild(tinymceTextArea)

    let tinymceOptions = {
        selector: "#tinymce-text-area",
        height: "100%",
        width: "100%",
        resize: false,
        menubar: false,
        statusbar: false,
        skin: 'oxide',
        content_css: 'default',
        license_key: 'gpl',
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
        setup: (editor:Editor) => {
          editor.on('Dirty', (e) => {
            let saveButton = document.getElementById('tool-bar-save-file') as HTMLButtonElement
            saveButton.disabled = false
          })
        }
    };

    if (localStorage.getItem("theme") === "dark") {
        tinymceOptions.skin = "oxide-dark";
        tinymceOptions.content_css = "dark";
    }

    tinymce.init(tinymceOptions);
}

async function populateToolBar() {
  let fileData = await getWorkshopFileData(WorkshopId, FileUUID)
  let fileVersions = await getFileVersions(FileUUID)
  let workshopData = await getWorkshopField(WorkshopId, 'name')

  // Info Column
  let title = document.getElementById('tool-bar-title') as HTMLElement
  const fileNameParts = fileData.name.split('/')
  title.innerHTML = fileNameParts[fileNameParts.length - 1]

  let uploadInput = document.getElementById('tool-bar-upload-file-input') as HTMLInputElement
  uploadInput.value = ''

  let uploadButton = document.getElementById('tool-bar-upload-file-button') as HTMLButtonElement
  uploadButton.disabled = true

  // Version Column
  let versionDropdown = document.getElementById('version-dropdown') as HTMLSelectElement
  emptyElement(versionDropdown)

  let selectedVersionHeader = document.createElement('span')
  selectedVersionHeader.classList.add('dropdown-header')
  selectedVersionHeader.innerHTML = 'Selected Version'
  versionDropdown.appendChild(selectedVersionHeader)

  let defaultVersionOption = document.createElement('a') as any
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
  let restoreButton = document.getElementById('tool-bar-restore-file') as HTMLButtonElement
  restoreButton.disabled = true
  if (VersionId != null && VersionId != fileData.current_version_id) {
    restoreButton.disabled = false
  }

  let saveButton = document.getElementById('tool-bar-save-file') as HTMLButtonElement
  saveButton.disabled = true
  
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    const pagePath = window.location.pathname
    const pathParts = pagePath.split('/')
    WorkshopId = Number(pathParts[pathParts.length - 4])
    FileUUID = pathParts[pathParts.length - 2]

    const backButton = document.getElementById('back-to-workshop-catalog') as HTMLAnchorElement
    backButton.href = `/private/management/workshops/${WorkshopId}/edit`
});

document.addEventListener("DOMContentLoaded", initialisePage);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).saveButtonOnClick = saveButtonOnClick;
        (<any>window).restoreButtonOnClick = restoreButtonOnClick;
        (<any>window).uploadFileInputOnChange = uploadFileInputOnChange;
        (<any>window).uploadFileButtonOnClick = uploadFileButtonOnClick;
    }
});
