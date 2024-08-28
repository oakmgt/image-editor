let canvas, ctx, isDragging = false, isResizing = false, isRotating = false;
let images = [], selectedImage = null;
let texts = [], selectedText = null;
let startX, startY, lastX, lastY;
const handleSize = 10;

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    // Load fonts before initializing the rest of the application
    document.fonts.ready.then(() => {
        canvas.addEventListener('dragover', handleDragOver);
        canvas.addEventListener('drop', handleDrop);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        window.addEventListener('resize', resizeCanvas);
        document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);
        document.getElementById('addTextBtn').addEventListener('click', addText);

        // Text control event listeners
        document.getElementById('textInput').addEventListener('input', updateSelectedText);
        document.getElementById('fontSelect').addEventListener('change', updateSelectedText);
        document.getElementById('fontSize').addEventListener('input', updateSelectedText);
        document.getElementById('fontColor').addEventListener('input', updateSelectedText);
        document.getElementById('outlineColor').addEventListener('input', updateSelectedText);
        document.getElementById('outlineThickness').addEventListener('input', updateSelectedText);
        document.getElementById('shadowBlur').addEventListener('input', updateSelectedText);
        document.getElementById('shadowColor').addEventListener('input', updateSelectedText);

        // Hide text controls initially
        hideTextControls();
    });
}

function addText() {
    const text = {
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
    texts.push(text);
    selectedText = text;
    drawAll();
}

function updateSelectedText() {
    if (selectedText) {
        selectedText.content = document.getElementById('textInput').value;
        selectedText.font = document.getElementById('fontSelect').value;
        selectedText.size = parseInt(document.getElementById('fontSize').value);
        selectedText.color = document.getElementById('fontColor').value;
        selectedText.outlineColor = document.getElementById('outlineColor').value;
        selectedText.outlineThickness = parseInt(document.getElementById('outlineThickness').value);
        selectedText.shadowBlur = parseInt(document.getElementById('shadowBlur').value);
        selectedText.shadowColor = document.getElementById('shadowColor').value;
        drawAll();
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawAll();
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const newImage = {
                    img: img,
                    width: img.width,
                    height: img.height,
                    x: (canvas.width - img.width) / 2,
                    y: (canvas.height - img.height) / 2,
                    angle: 0
                };
                images.push(newImage);
                selectedImage = newImage;
                drawAll();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach(drawImage);
    texts.forEach(drawText);

    if (selectedImage) {
        drawHandles(selectedImage);
    }
    if (selectedText) {
        drawTextHandles(selectedText);
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
    
    if (text.outlineThickness > 0) {
        ctx.strokeText(text.content, 0, 0);
    }
    ctx.fillText(text.content, 0, 0);
    ctx.restore();
}

function drawTextHandles(text) {
    const metrics = ctx.measureText(text.content);
    const width = metrics.width;
    const height = text.size;
    
    drawHandle(text.x, text.y - height);
    drawHandle(text.x + width, text.y - height);
    drawHandle(text.x, text.y);
    drawHandle(text.x + width, text.y);
    drawRotationHandle({x: text.x, y: text.y - height, width: width, height: height});
}

function drawHandles(img) {
    drawHandle(img.x, img.y);
    drawHandle(img.x + img.width, img.y);
    drawHandle(img.x, img.y + img.height);
    drawHandle(img.x + img.width, img.y + img.height);
    drawRotationHandle(img);
}

function drawHandle(x, y) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
}

function drawRotationHandle(img) {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(img.x + img.width / 2, img.y - 30, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

function handleMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedImage = images.find(img => isOverImage(x, y, img));
    selectedText = texts.find(text => isOverText(x, y, text));

    if (selectedImage) {
        if (isOverRotationHandle(x, y, selectedImage)) {
            isRotating = true;
        } else if (isOverResizeHandle(x, y, selectedImage)) {
            isResizing = true;
        } else {
            isDragging = true;
        }
        hideTextControls();
    } else if (selectedText) {
        if (isOverRotationHandle(x, y, getTextBounds(selectedText))) {
            isRotating = true;
        } else if (isOverResizeHandle(x, y, getTextBounds(selectedText))) {
            isResizing = true;
        } else {
            isDragging = true;
        }
        showTextControls(selectedText);
    } else {
        hideTextControls();
    }

    drawAll();
}

function showTextControls(text) {
    const textControls = document.getElementById('textControls');
    textControls.style.display = 'block';
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
    if (selectedText) {
        const textControls = document.getElementById('textControls');
        textControls.style.left = `${selectedText.x}px`;
        textControls.style.top = `${selectedText.y - selectedText.size - textControls.offsetHeight}px`;
    }
}

function hideTextControls() {
    document.getElementById('textControls').style.display = 'none';
}

function handleMouseMove(e) {
    if (!selectedImage && !selectedText) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isDragging) {
        if (selectedImage) {
            selectedImage.x += dx;
            selectedImage.y += dy;
        } else if (selectedText) {
            selectedText.x += dx;
            selectedText.y += dy;
            updateTextControlsPosition();
        }
    } else if (isResizing) {
        if (selectedImage) {
            selectedImage.width += dx;
            selectedImage.height += dy;
        } else if (selectedText) {
            selectedText.size += dy / 2;
            if (selectedText.size < 1) selectedText.size = 1;
        }
    } else if (isRotating) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let centerX, centerY;
        if (selectedImage) {
            centerX = selectedImage.x + selectedImage.width / 2;
            centerY = selectedImage.y + selectedImage.height / 2;
            selectedImage.angle = Math.atan2(y - centerY, x - centerX);
        } else if (selectedText) {
            const bounds = getTextBounds(selectedText);
            centerX = bounds.x + bounds.width / 2;
            centerY = bounds.y + bounds.height / 2;
            selectedText.angle = Math.atan2(y - centerY, x - centerX);
        }
    }

    startX = e.clientX;
    startY = e.clientY;
    drawAll();
}

function isOverText(x, y, text) {
    const bounds = getTextBounds(text);
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
}

function getTextBounds(text) {
    ctx.font = `${text.size}px ${text.font}`;
    const metrics = ctx.measureText(text.content);
    return {
        x: text.x,
        y: text.y - text.size,
        width: metrics.width,
        height: text.size
    };
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
}

function handleWheel(e) {
    e.preventDefault();
    if (selectedImage) {
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        selectedImage.width *= scaleFactor;
        selectedImage.height *= scaleFactor;
        drawAll();
    }
}

function isOverImage(x, y, img) {
    return x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height;
}

function isOverResizeHandle(x, y, img) {
    const handles = [
        {x: img.x, y: img.y},
        {x: img.x + img.width, y: img.y},
        {x: img.x, y: img.y + img.height},
        {x: img.x + img.width, y: img.y + img.height}
    ];
    return handles.some(handle => 
        x >= handle.x - handleSize / 2 && x <= handle.x + handleSize / 2 &&
        y >= handle.y - handleSize / 2 && y <= handle.y + handleSize / 2
    );
}

function isOverRotationHandle(x, y, img) {
    const centerX = img.x + img.width / 2;
    const centerY = img.y - 30;
    return Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) <= handleSize / 2;
}

function downloadCanvas() {
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw images without handles
    images.forEach(img => {
        tempCtx.save();
        tempCtx.translate(img.x + img.width / 2, img.y + img.height / 2);
        tempCtx.rotate(img.angle);
        tempCtx.drawImage(img.img, -img.width / 2, -img.height / 2, img.width, img.height);
        tempCtx.restore();
    });

    // Draw texts without handles
    texts.forEach(text => {
        tempCtx.save();
        tempCtx.translate(text.x, text.y);
        tempCtx.rotate(text.angle);
        tempCtx.font = `${text.size}px ${text.font}`;
        tempCtx.fillStyle = text.color;
        tempCtx.strokeStyle = text.outlineColor;
        tempCtx.lineWidth = text.outlineThickness;
        tempCtx.shadowBlur = text.shadowBlur;
        tempCtx.shadowColor = text.shadowColor;
        
        if (text.outlineThickness > 0) {
            tempCtx.strokeText(text.content, 0, 0);
        }
        tempCtx.fillText(text.content, 0, 0);
        tempCtx.restore();
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'canvas_image.png';
    link.href = tempCanvas.toDataURL();
    link.click();
}

window.onload = init;

