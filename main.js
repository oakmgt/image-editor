let canvas, ctx, isDragging = false, isResizing = false, isRotating = false;
let elements = [], selectedElement = null;
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
        document.getElementById('addImageBtn').addEventListener('click', () => document.getElementById('imageInput').click());
        document.getElementById('imageInput').addEventListener('change', handleImageUpload);

        // Text control event listeners
        document.getElementById('textInput').addEventListener('input', updateSelectedText);
        document.getElementById('fontSelect').addEventListener('change', updateSelectedText);
        document.getElementById('fontSize').addEventListener('input', updateSelectedText);
        document.getElementById('fontColor').addEventListener('input', updateSelectedText);
        document.getElementById('outlineColor').addEventListener('input', updateSelectedText);
        document.getElementById('outlineThickness').addEventListener('input', updateSelectedText);
        document.getElementById('shadowBlur').addEventListener('input', updateSelectedText);
        document.getElementById('shadowColor').addEventListener('input', updateSelectedText);

        // Layer control event listeners
        document.getElementById('moveUpBtn').addEventListener('click', moveLayerUp);
        document.getElementById('moveDownBtn').addEventListener('click', moveLayerDown);

        // Hide text controls initially
        hideTextControls();
        hideLayerControls();
    });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const newImage = {
                    type: 'image',
                    img: img,
                    width: img.width,
                    height: img.height,
                    x: (canvas.width - img.width) / 2,
                    y: (canvas.height - img.height) / 2,
                    angle: 0
                };
                elements.push(newImage);
                selectedElement = newImage;
                drawAll();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function addText() {
    const text = {
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
    elements.push(text);
    selectedElement = text;
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
    elements.forEach(element => {
        if (element.type === 'image') {
            drawImage(element);
        } else if (element.type === 'text') {
            drawText(element);
        }
    });

    if (selectedElement) {
        if (selectedElement.type === 'image') {
            drawHandles(selectedElement);
        } else if (selectedElement.type === 'text') {
            drawTextHandles(selectedElement);
        }
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

    let clickedOnHandle = false;

    // Check if clicked on a handle of the currently selected item
    if (selectedElement) {
        if (selectedElement.type === 'image' && (isOverRotationHandle(x, y, selectedElement) || isOverResizeHandle(x, y, selectedElement))) {
            isRotating = isOverRotationHandle(x, y, selectedElement);
            isResizing = isOverResizeHandle(x, y, selectedElement);
            clickedOnHandle = true;
        } else if (selectedElement.type === 'text') {
            const textBounds = getTextBounds(selectedElement);
            if (isOverRotationHandle(x, y, textBounds) || isOverResizeHandle(x, y, textBounds)) {
                isRotating = isOverRotationHandle(x, y, textBounds);
                isResizing = isOverResizeHandle(x, y, textBounds);
                clickedOnHandle = true;
            }
        }
    }

    if (!clickedOnHandle) {
        // Find all items under the click
        const clickedItems = elements.filter(element => 
            (element.type === 'image' && isOverImage(x, y, element)) ||
            (element.type === 'text' && isOverText(x, y, element))
        );

        // Select the topmost item
        if (clickedItems.length > 0) {
            selectedElement = clickedItems[clickedItems.length - 1];
            isDragging = true;
        } else {
            selectedElement = null;
        }
    }

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

    drawAll();
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
        textControls.style.left = `${selectedElement.x}px`;
        textControls.style.top = `${selectedElement.y - selectedElement.size - textControls.offsetHeight}px`;
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

function handleMouseMove(e) {
    if (!selectedElement) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isDragging) {
        selectedElement.x += dx;
        selectedElement.y += dy;
        if (selectedElement.type === 'text') {
            updateTextControlsPosition();
        }
        updateLayerControlsPosition();
    } else if (isResizing) {
        if (selectedElement.type === 'image') {
            selectedElement.width += dx;
            selectedElement.height += dy;
        } else if (selectedElement.type === 'text') {
            selectedElement.size += dy / 2;
            if (selectedElement.size < 1) selectedElement.size = 1;
        }
    } else if (isRotating) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let centerX, centerY;
        if (selectedElement.type === 'image') {
            centerX = selectedElement.x + selectedElement.width / 2;
            centerY = selectedElement.y + selectedElement.height / 2;
        } else if (selectedElement.type === 'text') {
            const bounds = getTextBounds(selectedElement);
            centerX = bounds.x + bounds.width / 2;
            centerY = bounds.y + bounds.height / 2;
        }
        selectedElement.angle = Math.atan2(y - centerY, x - centerX);
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
    if (selectedElement && selectedElement.type === 'image') {
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        selectedElement.width *= scaleFactor;
        selectedElement.height *= scaleFactor;
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

    // Draw elements without handles
    elements.forEach(element => {
        tempCtx.save();
        tempCtx.translate(element.x + (element.width ? element.width / 2 : 0), element.y + (element.height ? element.height / 2 : 0));
        tempCtx.rotate(element.angle);

        if (element.type === 'image') {
            tempCtx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
        } else if (element.type === 'text') {
            tempCtx.font = `${element.size}px ${element.font}`;
            tempCtx.fillStyle = element.color;
            tempCtx.strokeStyle = element.outlineColor;
            tempCtx.lineWidth = element.outlineThickness;
            tempCtx.shadowBlur = element.shadowBlur;
            tempCtx.shadowColor = element.shadowColor;
            
            if (element.outlineThickness > 0) {
                tempCtx.strokeText(element.content, 0, 0);
            }
            tempCtx.fillText(element.content, 0, 0);
        }

        tempCtx.restore();
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'canvas_image.png';
    link.href = tempCanvas.toDataURL();
    link.click();
}

window.onload = init;

