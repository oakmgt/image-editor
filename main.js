let canvas, ctx, isDragging = false, isResizing = false, isRotating = false;
let image, imageX, imageY, imageWidth, imageHeight, imageAngle = 0;
let startX, startY, lastX, lastY;
const handleSize = 10;

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', resizeCanvas);
    document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawImage();
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
                image = img;
                imageWidth = img.width;
                imageHeight = img.height;
                imageX = (canvas.width - imageWidth) / 2;
                imageY = (canvas.height - imageHeight) / 2;
                drawImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
        ctx.save();
        ctx.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);
        ctx.rotate(imageAngle);
        ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
        ctx.restore();

        // Draw handles
        drawHandle(imageX, imageY);
        drawHandle(imageX + imageWidth, imageY);
        drawHandle(imageX, imageY + imageHeight);
        drawHandle(imageX + imageWidth, imageY + imageHeight);
        drawRotationHandle();
    }
}

function drawHandle(x, y) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
}

function drawRotationHandle() {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(imageX + imageWidth / 2, imageY - 30, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

function handleMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isOverRotationHandle(x, y)) {
        isRotating = true;
    } else if (isOverResizeHandle(x, y)) {
        isResizing = true;
    } else if (isOverImage(x, y)) {
        isDragging = true;
    }
}

function handleMouseMove(e) {
    if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        imageX += dx;
        imageY += dy;
        startX = e.clientX;
        startY = e.clientY;
    } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        imageWidth += dx;
        imageHeight += dy;
        startX = e.clientX;
        startY = e.clientY;
    } else if (isRotating) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = imageX + imageWidth / 2;
        const centerY = imageY + imageHeight / 2;
        imageAngle = Math.atan2(y - centerY, x - centerX);
    }
    drawImage();
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
}

function handleWheel(e) {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    imageWidth *= scaleFactor;
    imageHeight *= scaleFactor;
    drawImage();
}

function isOverImage(x, y) {
    return x >= imageX && x <= imageX + imageWidth && y >= imageY && y <= imageY + imageHeight;
}

function isOverResizeHandle(x, y) {
    const handles = [
        {x: imageX, y: imageY},
        {x: imageX + imageWidth, y: imageY},
        {x: imageX, y: imageY + imageHeight},
        {x: imageX + imageWidth, y: imageY + imageHeight}
    ];
    return handles.some(handle => 
        x >= handle.x - handleSize / 2 && x <= handle.x + handleSize / 2 &&
        y >= handle.y - handleSize / 2 && y <= handle.y + handleSize / 2
    );
}

function isOverRotationHandle(x, y) {
    const centerX = imageX + imageWidth / 2;
    const centerY = imageY - 30;
    return Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) <= handleSize / 2;
}

function downloadCanvas() {
    const link = document.createElement('a');
    link.download = 'canvas_image.png';
    link.href = canvas.toDataURL();
    link.click();
}

window.onload = init;
