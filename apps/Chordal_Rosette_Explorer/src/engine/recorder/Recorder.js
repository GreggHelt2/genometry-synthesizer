export class Recorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    start(format = 'video/webm;codecs=vp9', bitrate = 2500000) {
        const stream = this.canvas.captureStream(30); // 30 FPS

        let options = { mimeType: format, videoBitsPerSecond: bitrate };

        // Fallback or validation could go here
        if (!MediaRecorder.isTypeSupported(format)) {
            console.warn(`${format} is not supported, falling back to default.`);
            options = { videoBitsPerSecond: bitrate }; // Let browser choose
        }

        try {
            this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error('Failed to create MediaRecorder:', e);
            return false;
        }

        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        console.log('Recording started');
        return true;
    }

    stop() {
        if (!this.mediaRecorder || !this.isRecording) return Promise.resolve(null);

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: this.mediaRecorder.mimeType
                });
                this.recordedChunks = [];
                this.isRecording = false;
                console.log('Recording stopped');
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    download(blob, filename = 'chordal-rosette.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}
