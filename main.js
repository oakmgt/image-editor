// Constants
const HANDLE_SIZE = 20; // Increased for better touch interaction

// Global variables
let canvas, ctx;
let elements = [], selectedElement = null;
let isDragging = false, isResizing = false, isRotating = false;
let startX, startY;
let isMobile = false;

// Initialization
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    checkMobile();

    document.fonts.ready.then(setupEventListeners);
}

function checkMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        adjustUIForMobile();
    }
}

function adjustUIForMobile() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
    });
    
    const textControls = document.getElementById('textControls');
    textControls.style.maxWidth = '90vw';
    textControls.style.flexWrap = 'wrap';
    
    const inputs = textControls.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.style.fontSize = '16px';
        input.style.padding = '5px';
    });
}

function setupEventListeners() {
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    if (isMobile) {
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
    } else {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
    }
    
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);
    document.getElementById('addTextBtn').addEventListener('click', addText);
    document.getElementById('addImageBtn').addEventListener('click', () => document.getElementById('imageInput').click());
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    document.getElementById('cameraBtn').addEventListener('click', startCamera);
    document.getElementById('cameraInput').addEventListener('change', handleCameraCapture);

    setupTextControlListeners();
    setupLayerControlListeners();

    hideTextControls();
    hideLayerControls();
}

function setupTextControlListeners() {
    const textControls = ['textInput', 'fontSelect', 'fontSize', 'fontColor', 'outlineColor', 'outlineThickness', 'shadowBlur', 'shadowColor'];
    textControls.forEach(control => {
        document.getElementById(control).addEventListener('input', updateSelectedText);
    });
}

function setupLayerControlListeners() {
    document.getElementById('layerControls').addEventListener('click', function(event) {
        if (event.target.id === 'moveUpBtn') {
            moveLayerUp();
        } else if (event.target.id === 'moveDownBtn') {
            moveLayerDown();
        } else if (event.target.id === 'deleteBtn' || event.target.closest('#deleteBtn')) {
            deleteSelectedElement();
        } else if (event.target.id === 'flipHorizontalBtn' || event.target.closest('#flipHorizontalBtn')) {
            flipSelectedElement('horizontal');
        } else if (event.target.id === 'flipVerticalBtn' || event.target.closest('#flipVerticalBtn')) {
            flipSelectedElement('vertical');
        } else if (event.target.id === 'effectsBtn' || event.target.closest('#effectsBtn')) {
            toggleEffectsDropdown();
        } else if (event.target.closest('#effectsDropdown')) {
            applyEffect(event.target.dataset.effect);
        }
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#effectsBtn') && !event.target.closest('#effectsDropdown')) {
            document.getElementById('effectsDropdown').classList.add('hidden');
        }
    });
}

function flipSelectedElement(direction) {
    if (selectedElement) {
        if (selectedElement.type === 'image') {
            if (direction === 'horizontal') {
                selectedElement.scaleX = (selectedElement.scaleX || 1) * -1;
            } else if (direction === 'vertical') {
                selectedElement.scaleY = (selectedElement.scaleY || 1) * -1;
            }
        } else if (selectedElement.type === 'text') {
            if (direction === 'horizontal') {
                selectedElement.scaleX = (selectedElement.scaleX || 1) * -1;
            } else if (direction === 'vertical') {
                selectedElement.scaleY = (selectedElement.scaleY || 1) * -1;
            }
        }
        drawAll();
    }
}

function toggleEffectsDropdown() {
    const dropdown = document.getElementById('effectsDropdown');
    dropdown.classList.toggle('hidden');
}

function applyEffect(effect) {
    if (selectedElement && selectedElement.type === 'image') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = selectedElement.width;
        tempCanvas.height = selectedElement.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(selectedElement.img, 0, 0, selectedElement.width, selectedElement.height);

        const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const effectImageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);

        // Apply the effect to effectImageData
        applyEffectToImageData(effect, originalImageData, effectImageData);

        // Animate the transition
        const startTime = performance.now();
        const duration = 500; // 500ms for half a second

        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const currentImageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);
            for (let i = 0; i < currentImageData.data.length; i += 4) {
                for (let j = 0; j < 4; j++) {
                    currentImageData.data[i + j] = originalImageData.data[i + j] * (1 - progress) + effectImageData.data[i + j] * progress;
                }
            }

            tempCtx.putImageData(currentImageData, 0, 0);

            const newImage = new Image();
            newImage.onload = function() {
                selectedElement.img = newImage;
                drawAll();
            };
            newImage.src = tempCanvas.toDataURL();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }
}

function applyEffectToImageData(effect, originalImageData, effectImageData) {
    const data = originalImageData.data;
    const effectData = effectImageData.data;
    const width = originalImageData.width;
    const height = originalImageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            switch (effect) {
                case 'blackAndWhite':
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    effectData[i] = effectData[i + 1] = effectData[i + 2] = avg > 128 ? 255 : 0;
                    break;
                case 'grayscale':
                    const grayAvg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    effectData[i] = effectData[i + 1] = effectData[i + 2] = grayAvg;
                    break;
                case 'deepFry':
                    // Increase contrast and saturation
                    for (let j = 0; j < 3; j++) {
                        effectData[i + j] = Math.min(255, Math.max(0, (data[i + j] - 128) * 2 + 128));
                    }
                    // Add noise
                    if (Math.random() < 0.05) {
                        effectData[i] = effectData[i + 1] = effectData[i + 2] = 255;
                    }
                    break;
                case 'invert':
                    effectData[i] = 255 - data[i];
                    effectData[i + 1] = 255 - data[i + 1];
                    effectData[i + 2] = 255 - data[i + 2];
                    break;
                case 'sepia':
                    effectData[i] = Math.min(255, (data[i] * 0.393) + (data[i + 1] * 0.769) + (data[i + 2] * 0.189));
                    effectData[i + 1] = Math.min(255, (data[i] * 0.349) + (data[i + 1] * 0.686) + (data[i + 2] * 0.168));
                    effectData[i + 2] = Math.min(255, (data[i] * 0.272) + (data[i + 1] * 0.534) + (data[i + 2] * 0.131));
                    break;
                case 'pixelate':
                    const pixelSize = 10;
                    const px = Math.floor(x / pixelSize) * pixelSize;
                    const py = Math.floor(y / pixelSize) * pixelSize;
                    const pixelIndex = (py * width + px) * 4;
                    effectData[i] = data[pixelIndex];
                    effectData[i + 1] = data[pixelIndex + 1];
                    effectData[i + 2] = data[pixelIndex + 2];
                    break;
                case 'vaporwave':
                    effectData[i] = Math.min(255, data[i] + 50);
                    effectData[i + 1] = data[i + 1];
                    effectData[i + 2] = Math.min(255, data[i + 2] + 50);
                    break;
                case 'glitch':
                    if (Math.random() < 0.1) {
                        const offset = Math.floor(Math.random() * 20) - 10;
                        const glitchIndex = ((y + offset + height) % height * width + x) * 4;
                        effectData[i] = data[glitchIndex];
                        effectData[i + 1] = data[glitchIndex + 1];
                        effectData[i + 2] = data[glitchIndex + 2];
                    } else {
                        effectData[i] = data[i];
                        effectData[i + 1] = data[i + 1];
                        effectData[i + 2] = data[i + 2];
                    }
                    break;
                case 'oil':
                    const radius = 4;
                    const intensity = 30;
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let oy = -radius; oy <= radius; oy++) {
                        for (let ox = -radius; ox <= radius; ox++) {
                            const sx = Math.min(Math.max(x + ox, 0), width - 1);
                            const sy = Math.min(Math.max(y + oy, 0), height - 1);
                            const sIndex = (sy * width + sx) * 4;
                            const weight = Math.floor((data[sIndex] + data[sIndex + 1] + data[sIndex + 2]) / 3 / (256 / intensity)) * (256 / intensity);
                            r += data[sIndex] * weight;
                            g += data[sIndex + 1] * weight;
                            b += data[sIndex + 2] * weight;
                            count += weight;
                        }
                    }
                    effectData[i] = r / count;
                    effectData[i + 1] = g / count;
                    effectData[i + 2] = b / count;
                    break;
                case 'neon':
                    const neonIntensity = 50;
                    effectData[i] = Math.min(255, data[i] + neonIntensity);
                    effectData[i + 1] = Math.min(255, data[i + 1] + neonIntensity);
                    effectData[i + 2] = Math.min(255, data[i + 2] + neonIntensity);
                    break;
                case 'emboss':
                    if (x > 0 && y > 0) {
                        const prevIndex = ((y - 1) * width + (x - 1)) * 4;
                        for (let j = 0; j < 3; j++) {
                            effectData[i + j] = 128 + (data[i + j] - data[prevIndex + j]);
                        }
                    } else {
                        effectData[i] = effectData[i + 1] = effectData[i + 2] = 128;
                    }
                    break;
                case 'cartoon':
                    const edgeThreshold = 80;
                    const levels = 5;
                    if (x > 0 && y > 0) {
                        const leftIndex = (y * width + (x - 1)) * 4;
                        const topIndex = ((y - 1) * width + x) * 4;
                        const edge = Math.abs(data[i] - data[leftIndex]) + Math.abs(data[i] - data[topIndex]);
                        if (edge > edgeThreshold) {
                            effectData[i] = effectData[i + 1] = effectData[i + 2] = 0;
                        } else {
                            for (let j = 0; j < 3; j++) {
                                effectData[i + j] = Math.floor(data[i + j] / (255 / levels)) * (255 / (levels - 1));
                            }
                        }
                    } else {
                        for (let j = 0; j < 3; j++) {
                            effectData[i + j] = Math.floor(data[i + j] / (255 / levels)) * (255 / (levels - 1));
                        }
                    }
                    break;
                case 'vintage':
                    effectData[i] = Math.min(255, (data[i] * 0.9) + (data[i + 1] * 0.5) + (data[i + 2] * 0.3));
                    effectData[i + 1] = Math.min(255, (data[i] * 0.3) + (data[i + 1] * 0.8) + (data[i + 2] * 0.2));
                    effectData[i + 2] = Math.min(255, (data[i] * 0.2) + (data[i + 1] * 0.3) + (data[i + 2] * 0.7));
                    break;
                case 'duotone':
                    const color1 = [255, 87, 34]; // Orange
                    const color2 = [33, 150, 243]; // Blue
                    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const t = gray / 255;
                    for (let j = 0; j < 3; j++) {
                        effectData[i + j] = Math.round(color1[j] * (1 - t) + color2[j] * t);
                    }
                    break;
            }
            effectData[i + 3] = data[i + 3]; // Keep original alpha
        }
    }
}

function deleteSelectedElement() {
    if (selectedElement) {
        if (confirm('Are you sure you want to delete this element?')) {
            const index = elements.indexOf(selectedElement);
            if (index > -1) {
                elements.splice(index, 1);
            }
            selectedElement = null;
            updateControlsVisibility();
            drawAll();
        }
    }
}

// Canvas operations
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 20; // Reduce height by 20px to accommodate the OAK MGT info
    drawAll();
    
    // Adjust the position of the OAK MGT info
    const oakMgtInfo = document.getElementById('oakMgtInfo');
    oakMgtInfo.style.bottom = '2px'; // Ensure it's at the very bottom
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.forEach(drawElement);
    if (selectedElement) {
        drawHandles(selectedElement);
    }
}

function drawElement(element) {
    if (element.type === 'image') {
        drawImage(element);
    } else if (element.type === 'text') {
        drawText(element);
    }
}

function drawImage(img) {
    ctx.save();
    ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
    ctx.rotate(img.angle);
    ctx.scale(img.scaleX || 1, img.scaleY || 1);
    ctx.drawImage(img.img, -img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
}

function drawText(text) {
    ctx.save();
    ctx.translate(text.x, text.y);
    ctx.rotate(text.angle);
    ctx.scale(text.scaleX || 1, text.scaleY || 1);
    ctx.font = `${text.size}px ${text.font}`;
    ctx.fillStyle = text.color;
    ctx.strokeStyle = text.outlineColor;
    ctx.lineWidth = text.outlineThickness;
    ctx.shadowBlur = text.shadowBlur;
    ctx.shadowColor = text.shadowColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (text.outlineThickness > 0) {
        ctx.strokeText(text.content, 0, 0);
    }
    ctx.fillText(text.content, 0, 0);
    ctx.restore();
}

function drawHandles(element) {
    if (element.type === 'image') {
        drawImageHandles(element);
    } else if (element.type === 'text') {
        drawTextHandles(element);
    }
}

function drawImageHandles(img) {
    drawHandle(img.x, img.y);
    drawHandle(img.x + img.width, img.y);
    drawHandle(img.x, img.y + img.height);
    drawHandle(img.x + img.width, img.y + img.height);
    drawRotationHandle(img);
}

function drawTextHandles(text) {
    const bounds = getTextBounds(text);
    drawHandle(bounds.x, bounds.y);
    drawHandle(bounds.x + bounds.width, bounds.y);
    drawHandle(bounds.x, bounds.y + bounds.height);
    drawHandle(bounds.x + bounds.width, bounds.y + bounds.height);
    drawRotationHandle(bounds);
}

function drawHandle(x, y) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
}

function drawRotationHandle(element) {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(element.x + element.width / 2, element.y - 30, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
}

// Image operations
function handleImageUpload(e) {
    const files = e.target.files;
    Array.from(files).forEach(processUploadedFile);
    e.target.value = ''; // Clear the file input
}

function startCamera() {
    const video = document.getElementById('cameraPreview');
    const captureCanvas = document.getElementById('captureCanvas');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported in this browser');
        alert('Camera access is not supported in this browser. Please try using a different browser or updating your current one.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.classList.remove('hidden');
            video.play();
            
            // Add capture button
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capture';
            captureBtn.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded';
            captureBtn.addEventListener('click', () => capturePhoto(video, captureCanvas, stream));
            document.body.appendChild(captureBtn);
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera access was denied. Please grant permission to use your camera and try again.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera was found on your device. Please make sure you have a working camera and try again.');
            } else {
                alert('An error occurred while trying to access the camera. Please check your camera settings and try again.');
            }
        });
}

function capturePhoto(video, captureCanvas, stream) {
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    captureCanvas.getContext('2d').drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    
    const imageDataUrl = captureCanvas.toDataURL('image/png');
    createImageElement(imageDataUrl, 'image/png');

    // Stop the camera stream and hide the video element
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    video.classList.add('hidden');
    
    // Remove the capture button
    const captureBtn = document.querySelector('button:not([id])');
    if (captureBtn) captureBtn.remove();
}

function handleCameraCapture(e) {
    const file = e.target.files[0];
    if (file) {
        processUploadedFile(file);
    }
    e.target.value = ''; // Clear the file input
}

function processUploadedFile(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            createImageElement(event.target.result, file.type)
                .then(newImage => {
                    elements.push(newImage);
                    selectedElement = newImage;
                    // Ensure the image is fully loaded before drawing
                    if (newImage.img.complete) {
                        drawAll();
                        hideLoadingIndicator();
                    } else {
                        newImage.img.onload = () => {
                            drawAll();
                            hideLoadingIndicator();
                        };
                    }
                })
                .catch(error => {
                    console.error("Failed to create image element:", error);
                    hideLoadingIndicator();
                });
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            hideLoadingIndicator();
        };
        reader.readAsDataURL(file);
    } else {
        console.error("Invalid file type:", file.type);
        hideLoadingIndicator();
    }
}

function createImageElement(src, fileType) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";  // Enable cross-origin image loading
        img.onload = function() {
            console.log("Image loaded successfully:", src);
            let croppedImage;
            try {
                croppedImage = fileType === 'image/png' ? cropTransparentEdges(img) : img;
                console.log("Image cropped successfully");
            } catch (error) {
                console.error("Error cropping image:", error);
                croppedImage = img;  // Use the original image if cropping fails
            }
            
            // Ensure minimum dimensions while maintaining aspect ratio
            const minDimension = 100; // Minimum width or height in pixels
            let width = croppedImage.width;
            let height = croppedImage.height;
            if (width < minDimension || height < minDimension) {
                const aspectRatio = width / height;
                if (width < height) {
                    width = minDimension;
                    height = width / aspectRatio;
                } else {
                    height = minDimension;
                    width = height * aspectRatio;
                }
            }
            
            const newImage = {
                type: 'image',
                img: croppedImage,
                width: width,
                height: height,
                x: (canvas.width - width) / 2,
                y: (canvas.height - height) / 2,
                angle: 0
            };
            resolve(newImage);
        };
        img.onerror = function(error) {
            console.error("Error loading image from URL:", src);
            alert("Failed to load image. The image might be protected or the server doesn't allow cross-origin requests.");
            hideLoadingIndicator();
            reject(error);
        };
        img.src = src;
    });
}

function cropTransparentEdges(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const { data, width, height } = imgData;

    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha !== 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (minX > maxX || minY > maxY) {
        console.log("Image is fully transparent");
        return img;
    }

    const padding = 1;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(img, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

    const croppedImage = new Image();
    croppedImage.src = croppedCanvas.toDataURL();
    return croppedImage;
}

// Text operations
function addText() {
    const text = createTextElement();
    elements.push(text);
    selectedElement = text;
    drawAll();
}

function createTextElement() {
    return {
        type: 'text',
        content: document.getElementById('textInput').value,
        font: document.getElementById('fontSelect').value,
        size: parseInt(document.getElementById('fontSize').value),
        color: document.getElementById('fontColor').value,
        outlineColor: document.getElementById('outlineColor').value,
        outlineThickness: parseInt(document.getElementById('outlineThickness').value),
        shadowBlur: parseInt(document.getElementById('shadowBlur').value),
        shadowColor: document.getElementById('shadowColor').value,
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0
    };
}

function updateSelectedText() {
    if (selectedElement && selectedElement.type === 'text') {
        selectedElement.content = document.getElementById('textInput').value;
        selectedElement.font = document.getElementById('fontSelect').value;
        selectedElement.size = parseInt(document.getElementById('fontSize').value);
        selectedElement.color = document.getElementById('fontColor').value;
        selectedElement.outlineColor = document.getElementById('outlineColor').value;
        selectedElement.outlineThickness = parseInt(document.getElementById('outlineThickness').value);
        selectedElement.shadowBlur = parseInt(document.getElementById('shadowBlur').value);
        selectedElement.shadowColor = document.getElementById('shadowColor').value;
        drawAll();
    }
}

// Event handlers
function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    console.log('Drop event triggered');
    console.log('DataTransfer types:', e.dataTransfer.types);
    
    showLoadingIndicator();
    
    if (e.dataTransfer.files.length > 0) {
        console.log('Files detected:', e.dataTransfer.files);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            console.log('Processing file:', file.name, 'Type:', file.type);
            processUploadedFile(file);
        } else {
            hideLoadingIndicator();
        }
    } else if (e.dataTransfer.items) {
        console.log('DataTransferItemList detected');
        let processed = false;
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            console.log('Item:', i, 'Kind:', e.dataTransfer.items[i].kind, 'Type:', e.dataTransfer.items[i].type);
            if (e.dataTransfer.items[i].kind === 'file') {
                const file = e.dataTransfer.items[i].getAsFile();
                if (file && file.type.startsWith('image/')) {
                    console.log('Processing file from item:', file.name, 'Type:', file.type);
                    processUploadedFile(file);
                    processed = true;
                    break;
                }
            } else if (e.dataTransfer.items[i].kind === 'string') {
                e.dataTransfer.items[i].getAsString((text) => {
                    console.log('String data:', text);
                    const imageUrl = extractImageUrlFromHtml(text);
                    if (imageUrl) {
                        console.log('Image URL detected:', imageUrl);
                        createImageElement(imageUrl, 'image/jpeg')
                            .then(newImage => {
                                elements.push(newImage);
                                selectedElement = newImage;
                                drawAll();
                                hideLoadingIndicator();
                            })
                            .catch(error => {
                                console.error("Failed to create image element:", error);
                                hideLoadingIndicator();
                            });
                        processed = true;
                    } else if (text.startsWith('data:image')) {
                        console.log('Image data URL detected');
                        createImageElement(text, text.split(';')[0].split(':')[1])
                            .then(newImage => {
                                elements.push(newImage);
                                selectedElement = newImage;
                                drawAll();
                                hideLoadingIndicator();
                            })
                            .catch(error => {
                                console.error("Failed to create image element:", error);
                                hideLoadingIndicator();
                            });
                        processed = true;
                    } else {
                        console.log('No image data detected in the string');
                        hideLoadingIndicator();
                    }
                });
            }
        }
        if (!processed) {
            hideLoadingIndicator();
        }
    } else {
        console.log('No recognized data in the drop event');
        hideLoadingIndicator();
    }

    // Log all available data for debugging
    console.log('Full drop event:', e);
    console.log('DataTransfer object:', e.dataTransfer);
    if (e.dataTransfer.getData) {
        console.log('HTML:', e.dataTransfer.getData('text/html'));
        console.log('URL:', e.dataTransfer.getData('text/uri-list'));
        console.log('Plain text:', e.dataTransfer.getData('text/plain'));
    }
}

function extractImageUrlFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgElement = doc.querySelector('img');
    return imgElement ? imgElement.src : null;
}

function showLoadingIndicator() {
    // Create and show a loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.textContent = 'Loading...';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.padding = '10px';
    loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.borderRadius = '5px';
    loadingIndicator.style.zIndex = '1000';
    document.body.appendChild(loadingIndicator);
}

function hideLoadingIndicator() {
    // Remove the loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function handleMouseDown(e) {
    handleStart(e.clientX, e.clientY);
}

function handleMouseMove(e) {
    handleMove(e.clientX, e.clientY);
}

function handleMouseUp() {
    handleEnd();
}

function handleTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }
}

function handleTouchEnd() {
    handleEnd();
}

function handleStart(clientX, clientY) {
    const { x, y } = getCanvasCoordinates({ clientX, clientY });
    let clickedOnHandle = checkHandleClick(x, y);

    if (!clickedOnHandle) {
        const clickedItems = elements.filter(element => isOverElement(x, y, element));
        selectedElement = clickedItems.length > 0 ? clickedItems[clickedItems.length - 1] : null;
        isDragging = selectedElement !== null;
    }

    updateControlsVisibility();
    startX = clientX;
    startY = clientY;
    drawAll();
}

function handleMove(clientX, clientY) {
    if (!selectedElement) return;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (isDragging) {
        moveElement(selectedElement, dx, dy);
    } else if (isResizing) {
        resizeElement(selectedElement, dx, dy);
    } else if (isRotating) {
        rotateElement(selectedElement, { clientX, clientY });
    }

    startX = clientX;
    startY = clientY;
    updateControlsPosition();
    drawAll();
}

function handleEnd() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
}

function handleWheel(e) {
    e.preventDefault();
    if (selectedElement && selectedElement.type === 'image') {
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        selectedElement.width *= scaleFactor;
        selectedElement.height *= scaleFactor;
        drawAll();
    }
}

// Helper functions
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function getTouchCanvasCoordinates(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

function checkHandleClick(x, y) {
    if (!selectedElement) return false;

    const element = selectedElement.type === 'text' ? getTextBounds(selectedElement) : selectedElement;
    isRotating = isOverRotationHandle(x, y, element);
    isResizing = isOverResizeHandle(x, y, element);

    return isRotating || isResizing;
}

function isOverElement(x, y, element) {
    if (element.type === 'image') {
        return isOverImage(x, y, element);
    } else if (element.type === 'text') {
        return isOverText(x, y, element);
    }
    return false;
}

function isOverImage(x, y, img) {
    return x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height;
}

function isOverText(x, y, text) {
    const bounds = getTextBounds(text);
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
}

function getTextBounds(text) {
    ctx.font = `${text.size}px ${text.font}`;
    const metrics = ctx.measureText(text.content);
    const width = metrics.width;
    const height = text.size; // Approximation, as actualBoundingBox might not be supported in all browsers
    return {
        x: text.x - width / 2,
        y: text.y - height / 2,
        width: width,
        height: height
    };
}

function isOverResizeHandle(x, y, element) {
    const handles = [
        {x: element.x, y: element.y},
        {x: element.x + element.width, y: element.y},
        {x: element.x, y: element.y + element.height},
        {x: element.x + element.width, y: element.y + element.height}
    ];
    return handles.some(handle => 
        x >= handle.x - HANDLE_SIZE / 2 && x <= handle.x + HANDLE_SIZE / 2 &&
        y >= handle.y - HANDLE_SIZE / 2 && y <= handle.y + HANDLE_SIZE / 2
    );
}

function isOverRotationHandle(x, y, element) {
    const centerX = element.x + element.width / 2;
    const centerY = element.y - 30;
    return Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) <= HANDLE_SIZE / 2;
}

function moveElement(element, dx, dy) {
    element.x += dx;
    element.y += dy;
}

function resizeElement(element, dx, dy) {
    if (element.type === 'image') {
        element.width += dx;
        element.height += dy;
    } else if (element.type === 'text') {
        element.size += dy / 2;
        if (element.size < 1) element.size = 1;
    }
}

function rotateElement(element, e) {
    const { x, y } = getCanvasCoordinates(e);
    let centerX, centerY;
    if (element.type === 'image') {
        centerX = element.x + element.width / 2;
        centerY = element.y + element.height / 2;
    } else if (element.type === 'text') {
        const bounds = getTextBounds(element);
        centerX = bounds.x + bounds.width / 2;
        centerY = bounds.y + bounds.height / 2;
    }
    element.angle = Math.atan2(y - centerY, x - centerX);
}

// UI controls
function updateControlsVisibility() {
    if (selectedElement) {
        if (selectedElement.type === 'image') {
            hideTextControls();
            showLayerControls();
        } else if (selectedElement.type === 'text') {
            showTextControls(selectedElement);
            showLayerControls();
        }
    } else {
        hideTextControls();
        hideLayerControls();
    }
}

function showTextControls(text) {
    const textControls = document.getElementById('textControls');
    textControls.classList.remove('hidden');
    updateTextControlsPosition();
    
    document.getElementById('textInput').value = text.content;
    document.getElementById('fontSelect').value = text.font;
    document.getElementById('fontSize').value = text.size;
    document.getElementById('fontColor').value = text.color;
    document.getElementById('outlineColor').value = text.outlineColor;
    document.getElementById('outlineThickness').value = text.outlineThickness;
    document.getElementById('shadowBlur').value = text.shadowBlur;
    document.getElementById('shadowColor').value = text.shadowColor;
}

function updateTextControlsPosition() {
    if (selectedElement && selectedElement.type === 'text') {
        const textControls = document.getElementById('textControls');
        const bounds = getTextBounds(selectedElement);
        textControls.style.left = `${bounds.x}px`;
        textControls.style.top = `${bounds.y - textControls.offsetHeight - 10}px`;
    }
}

function hideTextControls() {
    document.getElementById('textControls').classList.add('hidden');
}

function showLayerControls() {
    const layerControls = document.getElementById('layerControls');
    layerControls.classList.remove('hidden');
    updateLayerControlsPosition();
}

function hideLayerControls() {
    document.getElementById('layerControls').classList.add('hidden');
}

function updateLayerControlsPosition() {
    if (selectedElement) {
        const layerControls = document.getElementById('layerControls');
        const bounds = selectedElement.type === 'image' ? selectedElement : getTextBounds(selectedElement);
        layerControls.style.left = `${bounds.x}px`;
        layerControls.style.top = `${bounds.y + bounds.height + 10}px`;
    }
}

function updateControlsPosition() {
    updateTextControlsPosition();
    updateLayerControlsPosition();
}

function moveLayerUp() {
    if (selectedElement) {
        const index = elements.indexOf(selectedElement);
        if (index < elements.length - 1) {
            [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
        }
    }
    drawAll();
}

function moveLayerDown() {
    if (selectedElement) {
        const index = elements.indexOf(selectedElement);
        if (index > 0) {
            [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
        }
    }
    drawAll();
}

// Download functionality
function downloadCanvas() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    elements.forEach(element => {
        tempCtx.save();
        if (element.type === 'image') {
            tempCtx.translate(element.x + element.width / 2, element.y + element.height / 2);
            tempCtx.rotate(element.angle);
            tempCtx.scale(element.scaleX || 1, element.scaleY || 1);
            tempCtx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
        } else if (element.type === 'text') {
            tempCtx.translate(element.x, element.y);
            tempCtx.rotate(element.angle);
            tempCtx.scale(element.scaleX || 1, element.scaleY || 1);
            tempCtx.font = `${element.size}px ${element.font}`;
            tempCtx.fillStyle = element.color;
            tempCtx.strokeStyle = element.outlineColor;
            tempCtx.lineWidth = element.outlineThickness;
            tempCtx.shadowBlur = element.shadowBlur;
            tempCtx.shadowColor = element.shadowColor;
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            
            if (element.outlineThickness > 0) {
                tempCtx.strokeText(element.content, 0, 0);
            }
            tempCtx.fillText(element.content, 0, 0);
        }
        tempCtx.restore();
    });

    // Crop transparent edges
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const { data, width, height } = imageData;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha !== 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    // Add padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = maxX - minX + 1;
    croppedCanvas.height = maxY - minY + 1;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(tempCanvas, minX, minY, croppedCanvas.width, croppedCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height);

    const link = document.createElement('a');
    link.download = 'canvas_image.png';
    link.href = croppedCanvas.toDataURL();
    link.click();
}

window.onload = init;
