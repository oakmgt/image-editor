// Constants
const HANDLE_SIZE = 10;

// Global variables
let canvas, ctx;
let elements = [], selectedElement = null;
let isDragging = false, isResizing = false, isRotating = false;
let startX, startY;

// Initialization
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    document.fonts.ready.then(setupEventListeners);
}

function setupEventListeners() {
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);
    document.getElementById('addTextBtn').addEventListener('click', addText);
    document.getElementById('addImageBtn').addEventListener('click', () => document.getElementById('imageInput').click());
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    document.getElementById('cameraBtn').addEventListener('click', () => document.getElementById('cameraInput').click());
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
    document.getElementById('moveUpBtn').addEventListener('click', moveLayerUp);
    document.getElementById('moveDownBtn').addEventListener('click', moveLayerDown);
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
    ctx.drawImage(img.img, -img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
}

function drawText(text) {
    ctx.save();
    ctx.translate(text.x, text.y);
    ctx.rotate(text.angle);
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
        reader.onload = (event) => createImageElement(event.target.result, file.type);
        reader.readAsDataURL(file);
    }
}

function createImageElement(src, fileType) {
    const img = new Image();
    img.onload = function() {
        let croppedImage = fileType === 'image/png' ? cropTransparentEdges(img) : img;
        croppedImage.onload = function() {
            const newImage = {
                type: 'image',
                img: croppedImage,
                width: croppedImage.width,
                height: croppedImage.height,
                x: (canvas.width - croppedImage.width) / 2,
                y: (canvas.height - croppedImage.height) / 2,
                angle: 0
            };
            elements.push(newImage);
            selectedElement = newImage;
            drawAll();
        };
        if (croppedImage !== img) {
            croppedImage.src = croppedImage.toDataURL();
        } else {
            croppedImage.onload();
        }
    };
    img.src = src;
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processUploadedFile(file);
    }
}

function handleMouseDown(e) {
    const { x, y } = getCanvasCoordinates(e);
    let clickedOnHandle = checkHandleClick(x, y);

    if (!clickedOnHandle) {
        const clickedItems = elements.filter(element => isOverElement(x, y, element));
        selectedElement = clickedItems.length > 0 ? clickedItems[clickedItems.length - 1] : null;
        isDragging = selectedElement !== null;
    }

    updateControlsVisibility();
    startX = e.clientX;
    startY = e.clientY;
    drawAll();
}

function handleMouseMove(e) {
    if (!selectedElement) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isDragging) {
        moveElement(selectedElement, dx, dy);
    } else if (isResizing) {
        resizeElement(selectedElement, dx, dy);
    } else if (isRotating) {
        rotateElement(selectedElement, e);
    }

    startX = e.clientX;
    startY = e.clientY;
    updateControlsPosition();
    drawAll();
}

function handleMouseUp() {
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
            tempCtx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
        } else if (element.type === 'text') {
            tempCtx.translate(element.x, element.y);
            tempCtx.rotate(element.angle);
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
