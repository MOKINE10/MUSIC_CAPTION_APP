from flask import Flask, request, render_template, jsonify, send_from_directory, send_file
from pydub import AudioSegment
import os
import json

# pydubにffmpegのパスを設定
from pydub.utils import which
AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if file:
        filename = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filename)
        audio = AudioSegment.from_file(filename)
        duration = len(audio) / 1000  # ミリ秒を秒に変換
        return jsonify({'filename': file.filename, 'duration': duration})
    return jsonify({'error': 'No file uploaded'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/timestamp', methods=['POST'])
def get_timestamp():
    current_time = request.form['current_time']
    return jsonify({'timestamp': current_time})

@app.route('/download_srt', methods=['POST'])
def download_srt():
    captions = request.form['captions']
    captions = json.loads(captions)
    srt_content = ""
    for i, caption in enumerate(captions):
        srt_content += f"{i+1}\n{caption['timestamp']} --> {caption['end_timestamp']}\n{caption['text']}\n\n"

    srt_path = os.path.join(UPLOAD_FOLDER, 'captions.srt')
    with open(srt_path, 'w') as f:
        f.write(srt_content)

    return send_file(srt_path, as_attachment=True)

@app.route('/delete_mp3', methods=['POST'])
def delete_mp3():
    filename = request.form['filename']
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({'success': True})
    return jsonify({'error': 'File not found'}), 400

if __name__ == '__main__':
    app.run(debug=True)
