document.addEventListener('DOMContentLoaded', function() {

    // --- Conditional "Other Service" Field ---
    const servicesSelect = document.getElementById('services_availed');
    const otherServiceDiv = document.getElementById('other_service_div');
    const otherServiceInput = document.getElementById('other_service');

    function toggleOtherService() {
        if (servicesSelect.value === 'Others') {
            otherServiceDiv.classList.remove('hidden');
            otherServiceInput.required = true;
        } else {
            otherServiceDiv.classList.add('hidden');
            otherServiceInput.required = false;
            otherServiceInput.value = ''; // Clear value when hidden
        }
    }

    // Add event listener to the services dropdown
    if(servicesSelect) {
        servicesSelect.addEventListener('change', toggleOtherService);
        toggleOtherService(); // Initial check on page load
    }


    // --- Basic Signature Pad ---
    const canvas = document.getElementById('signatureCanvas');
    const canvasContainer = document.querySelector('.canvas-container');
    const clearButton = document.getElementById('clearSignatureBtn');
    const signatureDataInput = document.getElementById('signatureData');
    let ctx = null; // Initialize later
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasSigned = false;

    // Function to initialize or re-initialize the canvas context
    function setupCanvas() {
        if (!canvas) return; // Exit if canvas not found
        ctx = canvas.getContext('2d');
        resizeCanvas(); // Size canvas initially
        setContextStyle(); // Set initial style
        clearCanvas(false); // Clear drawing but keep potential data if resizing
    }

    // Function to resize canvas based on container
    function resizeCanvas() {
        if (!canvas || !canvasContainer) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvasContainer.offsetWidth * ratio;
        canvas.height = canvasContainer.offsetHeight * ratio;
        canvas.style.width = `${canvasContainer.offsetWidth}px`;
        canvas.style.height = `${canvasContainer.offsetHeight}px`;
        ctx.scale(ratio, ratio); // Scale context for high-DPI displays
        // Note: Re-drawing existing signature after resize is complex and omitted.
    }

    // Set line style (needs to be reset after resize/clear)
    function setContextStyle() {
        if (!ctx) return;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    function getCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        // Adjust for canvas scaling
        const scaleX = canvas.width / (ctx.canvas.width / (window.devicePixelRatio || 1)) / rect.width;
        const scaleY = canvas.height / (ctx.canvas.height / (window.devicePixelRatio || 1)) / rect.height;

        return {
            x: (clientX - rect.left), // * scaleX - Already scaled by ctx.scale
            y: (clientY - rect.top) // * scaleY - Already scaled by ctx.scale
        };
    }

    function startDrawing(e) {
        if (!ctx) return;
        e.preventDefault();
        isDrawing = true;
        const coords = getCoordinates(e);
        [lastX, lastY] = [coords.x, coords.y];
    }

    function draw(e) {
        if (!isDrawing || !ctx) return;
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
        if (hasSigned && canvas) {
            try {
                // Store the signature as a Data URL
                signatureDataInput.value = canvas.toDataURL('image/png');
            } catch (error) {
                console.error("Error saving signature:", error);
                // Could be due to tainted canvas if images were loaded improperly
            }
        }
    }

    function clearCanvas(clearData = true) {
        if (!ctx || !canvas) return;
        // Use scale factor for clearing correctly
        const ratio = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
        setContextStyle(); // Reset style after clearing
        if (clearData) {
            signatureDataInput.value = '';
            hasSigned = false;
        }
    }

    // Initialize Canvas only if element exists
    if (canvas && canvasContainer && clearButton && signatureDataInput) {
        setupCanvas(); // Initialize canvas and context

        // Event Listeners for Signature Pad
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
            // Debounce resize event to avoid excessive calls
            resizeTimeout = setTimeout(setupCanvas, 150);
        });
    }


    // --- Form Submission Handling ---
    window.handleSubmit = function(event) {
        event.preventDefault(); // Prevent default submission

        const form = document.getElementById('registrationForm');
        const termsCheckbox = document.getElementById('termsCheckbox');
        let firstErrorElement = null; // To focus on the first error

        // Reset previous error styles (simple example)
         form.querySelectorAll('.modern-input, .canvas-container, .check-label').forEach(el => {
             el.style.borderColor = ''; // Reset border color
             el.style.outline = ''; // Reset outline
         });

        // Check required fields (basic check, more robust validation recommended)
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            let fieldValid = true;
             if (field.type === 'checkbox') {
                fieldValid = field.checked;
             } else {
                 // Check if field is visible (don't validate hidden 'other_service')
                const isVisible = !!( field.offsetWidth || field.offsetHeight || field.getClientRects().length );
                if(isVisible) {
                    fieldValid = field.value.trim() !== '';
                } else {
                     fieldValid = true; // Skip validation if not visible
                 }
            }

            if (!fieldValid) {
                isValid = false;
                const fieldElement = (field.type === 'checkbox') ? field.closest('.check-label') : field;
                fieldElement.style.borderColor = 'red'; // Highlight error
                // Set focus target to the first invalid field found
                if (!firstErrorElement) {
                    firstErrorElement = field;
                }
                 console.warn(`Validation failed for: ${field.name || field.id}`);
            }
        });


        // Check Signature (if required)
        if (!hasSigned && signatureDataInput) { // Check if signature exists
             isValid = false;
             if(canvasContainer) {
                canvasContainer.style.borderColor = 'red';
             }
             if (!firstErrorElement) {
                 firstErrorElement = canvasContainer || canvas; // Focus container or canvas
             }
             console.warn("Validation failed: Signature missing");
        }

        if (!isValid) {
            alert('Please fill in all required fields and provide a signature.');
            // Scroll to and focus the first element with an error
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Try focusing after scrolling
                setTimeout(() => { firstErrorElement.focus(); }, 300);
            }
            return; // Stop submission
        }


        // --- If valid, proceed ---
        const formData = new FormData(form);
        console.log('Form Data (Revised Style):');
        for (let [key, value] of formData.entries()) {
            if (key === 'signatureData' && value.length > 50) {
                console.log(`${key}: ${value.substring(0, 40)}... [Data URL]`);
            } else if (key === 'firstTimeVisit' && !formData.has(key)) {
                // If checkbox is unchecked, it won't be in formData, handle if needed
                 console.log(`${key}: No`); // Or handle absence server-side
            }
            else {
                console.log(`${key}: ${value}`);
            }
        }

        alert('Form submitted (simulation)! Check the console.');

        // In a real app, send formData via fetch()
        /*
        fetch('/your-server-endpoint', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            alert('Registration successful!');
            form.reset(); // Reset form fields
            clearCanvas(true); // Clear signature
            toggleOtherService(); // Reset conditional field display
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred during registration.');
        });
        */
    }

});
