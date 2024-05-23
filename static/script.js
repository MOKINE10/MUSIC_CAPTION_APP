let audioPlayer = document.getElementById('audioPlayer');
let fileInput = document.getElementById('fileInput');
let captionInput = document.getElementById('captionInput');
let captionTable = document.getElementById('captionTable').getElementsByTagName('tbody')[0];
let uploadedFilename = '';
let audioDuration = 0;
let previewEnabled = false;
let previewWindow = document.getElementById('previewWindow');
let previewButton = document.getElementById('previewButton');

fileInput.addEventListener('change', function(event) {
    let file = event.target.files[0];
    if (file) {
        let formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.filename) {
                audioPlayer.src = `/uploads/${data.filename}`;
                uploadedFilename = data.filename;
                audioDuration = data.duration;
            }
        })
        .catch(error => console.error('Error:', error));
    }
});

function setPlaybackRate(rate) {
    audioPlayer.playbackRate = rate;
}

function saveCaptions() {
    let captions = captionInput.value.split('\n');
    captionTable.innerHTML = "";
    captions.forEach((caption, index) => {
        let row = captionTable.insertRow(index);
        let timestampCell = row.insertCell(0);
        let textCell = row.insertCell(1);
        timestampCell.innerHTML = "";
        textCell.innerHTML = caption;
        textCell.contentEditable = true;
    });
}

function addTimestamp() {
    let currentTime = audioPlayer.currentTime;
    fetch('/timestamp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `current_time=${currentTime}`
    })
    .then(response => response.json())
    .then(data => {
        let rows = captionTable.rows;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].cells[0].innerHTML === "") {
                rows[i].cells[0].innerHTML = formatTime(data.timestamp);
                break;
            }
        }
    })
    .catch(error => console.error('Error:', error));
}

function formatTime(seconds) {
    let date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substr(11, 12).replace('.', ',');
}

function downloadSRT() {
    let captions = [];
    let rows = captionTable.rows;
    for (let i = 0; i < rows.length; i++) {
        let timestamp = rows[i].cells[0].innerHTML;
        let text = rows[i].cells[1].innerHTML;
        let endTimestamp = (i < rows.length - 1) ? rows[i + 1].cells[0].innerHTML : formatTime(audioDuration);
        captions.push({ timestamp: timestamp, end_timestamp: endTimestamp, text: text });
    }

    let srt_content = "";
    for (let i = 0; i < captions.length; i++) {
        srt_content += `${i+1}\n${captions[i].timestamp} --> ${captions[i].end_timestamp}\n${captions[i].text}\n\n`;
    }

    let blob = new Blob([srt_content], { type: 'text/srt' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'captions.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function undoTimestamp() {
    let rows = captionTable.rows;
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].cells[0].innerHTML !== "") {
            rows[i].cells[0].innerHTML = "";
            break;
        }
    }
}

function deleteMp3() {
    if (uploadedFilename) {
        fetch('/delete_mp3', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `filename=${uploadedFilename}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                audioPlayer.src = "";
                uploadedFilename = "";
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function togglePreview() {
    previewEnabled = !previewEnabled;
    if (previewEnabled) {
        audioPlayer.addEventListener('timeupdate', updatePreview);
        previewButton.textContent = 'Preview ON';
        previewButton.classList.remove('preview-off');
        previewButton.classList.add('preview-on');
    } else {
        audioPlayer.removeEventListener('timeupdate', updatePreview);
        previewWindow.innerHTML = "";
        previewButton.textContent = 'Preview OFF';
        previewButton.classList.remove('preview-on');
        previewButton.classList.add('preview-off');
    }
}

function updatePreview() {
    let currentTime = audioPlayer.currentTime;
    let rows = captionTable.rows;
    for (let i = 0; i < rows.length; i++) {
        let start = timeStringToSeconds(rows[i].cells[0].innerHTML);
        let end = i < rows.length - 1 ? timeStringToSeconds(rows[i + 1].cells[0].innerHTML) : Number.MAX_VALUE;
        if (currentTime >= start && currentTime < end) {
            previewWindow.innerHTML = rows[i].cells[1].innerHTML;
            break;
        } else {
            previewWindow.innerHTML = "";
        }
    }
}

function timeStringToSeconds(timeString) {
    let parts = timeString.split(':');
    let secondsParts = parts[2].split(',');
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(secondsParts[0]) + parseFloat(secondsParts[1]) / 1000;
}

function rewind() {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 2);
}
