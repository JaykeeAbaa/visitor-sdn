document.addEventListener('DOMContentLoaded', function() {

    // --- Conditional "Other Service" Field ---
    const serviceOtherCheckbox = document.getElementById('serviceOtherCheckbox');
    const otherServiceGroup = document.getElementById('otherServiceGroup');
    const otherServiceInput = document.getElementById('otherService');
    const allServiceCheckboxes = document.querySelectorAll('.service-checkbox');

    function toggleOtherService() {
        if (serviceOtherCheckbox.checked) {
            otherServiceGroup.style.display = 'block';
            otherServiceInput.required = true;
        } else {
            otherServiceGroup.style.display = 'none';
            otherServiceInput.required = false;
            otherServiceInput.value = '';
        }
    }

    allServiceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', toggleOtherService);
    });
    toggleOtherService(); // Initial check


    // --- Basic Signature Pad ---
    const canvas = document.getElementById('signatureCanvas');
    const canvasContainer = document.querySelector('.canvas-container');
    const clearButton = document.getElementById('clearSignatureBtn');
    const signatureDataInput = document.getElementById('signatureData');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasSigned = false;

    // Function to resize canvas based on container
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvasContainer.offsetWidth * ratio;
        canvas.height = canvasContainer.offsetHeight * ratio;
        canvas.style.width = `${canvasContainer.offsetWidth}px`;
        canvas.style.height = `${canvasContainer.offsetHeight}px`;
        ctx.scale(ratio, ratio);
        // Redraw existing signature if needed (complex, omitted here for simplicity)
        // Or clear it
        clearCanvas(false); // Clear without clearing data input if resizing
    }

    // Set line style (needs to be reset after resize)
    function setContextStyle() {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    function getCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
         // No scaling needed here as canvas style width/height match element
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const coords = getCoordinates(e);
        [lastX, lastY] = [coords.x, coords.y];
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        [lastX, lastY] = [coords.x, coords.y];
        hasSigned = true;
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        if (hasSigned) {
            // Store the signature as a Data URL
            // Use lower quality jpeg for smaller size, or png for higher quality
            signatureDataInput.value = canvas.toDataURL('image/png');
            // signatureDataInput.value = canvas.toDataURL('image/jpeg', 0.8);
        }
    }

    function clearCanvas(clearData = true) {
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1)); // Adjust clearRect for scale
        setContextStyle(); // Reset style after clearing
        if(clearData) {
            signatureDataInput.value = '';
            hasSigned = false;
        }
    }

    // Initial setup
    resizeCanvas(); // Size canvas initially
    setContextStyle(); // Set initial style

    // Event Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    clearButton.addEventListener('click', () => clearCanvas(true));

    // Resize listener
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100); // Debounce resize events
    });


    // --- Form Submission Handling ---
    window.handleSubmit = function(event) {
        event.preventDefault();

        const form = document.getElementById('registrationForm');
        const termsCheckbox = document.getElementById('termsCheckbox');

        // Check if signature exists (if considered required)
        // You might make signature optional, adjust this check accordingly
        if (!hasSigned) {
            alert('Please provide a signature.');
            canvasContainer.style.borderColor = 'red'; // Highlight canvas area
            canvasContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        } else {
            canvasContainer.style.borderColor = '#ccc'; // Reset border
        }

        // Check if terms are agreed to
        if (!termsCheckbox.checked) {
            alert('You must agree to the Terms & Conditions.');
            termsCheckbox.parentElement.style.outline = '1px solid red'; // Highlight terms
             termsCheckbox.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        } else {
             termsCheckbox.parentElement.style.outline = 'none';
        }


        const formData = new FormData(form);
        console.log('Form Data (New Style):');
         for (let [key, value] of formData.entries()) {
             if (key === 'services') {
                 console.log(`${key}: ${formData.getAll('services').join(', ')}`);
             } else if (key === 'signatureData') {
                 console.log(`${key}: ${value.substring(0,40)}... [Data URL]`); // Log only beginning of data URL
             }
             else {
                 console.log(`${key}: ${value}`);
             }
        }

        alert('Form submitted (simulation)! Check the console.');
        // In a real app, send formData via fetch() here
        // fetch('/your-endpoint', { method: 'POST', body: formData }) ...
        // Optional: Reset form
        // form.reset();
        // clearCanvas(true);
        // toggleOtherService(); // Re-check conditional fields after reset
    }
});