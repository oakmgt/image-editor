let canvas, ctx, isDragging = false, isResizing = false, isRotating = false;
let images = [], selectedImage = null;
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
                drawImages();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function drawImages() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach(img => {
        ctx.save();
        ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
        ctx.rotate(img.angle);
        ctx.drawImage(img.img, -img.width / 2, -img.height / 2, img.width, img.height);
        ctx.restore();
    });

    if (selectedImage) {
        drawHandles(selectedImage);
    }
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

    if (selectedImage) {
        if (isOverRotationHandle(x, y, selectedImage)) {
            isRotating = true;
        } else if (isOverResizeHandle(x, y, selectedImage)) {
            isResizing = true;
        } else {
            isDragging = true;
        }
    }

    drawImages();
}

function handleMouseMove(e) {
    if (!selectedImage) return;

    if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        selectedImage.x += dx;
        selectedImage.y += dy;
        startX = e.clientX;
        startY = e.clientY;
    } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        selectedImage.width += dx;
        selectedImage.height += dy;
        startX = e.clientX;
        startY = e.clientY;
    } else if (isRotating) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = selectedImage.x + selectedImage.width / 2;
        const centerY = selectedImage.y + selectedImage.height / 2;
        selectedImage.angle = Math.atan2(y - centerY, x - centerX);
    }
    drawImages();
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
        drawImages();
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
    const link = document.createElement('a');
    link.download = 'canvas_image.png';
    link.href = canvas.toDataURL();
    link.click();
}

window.onload = init;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawImages();
}
