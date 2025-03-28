document.addEventListener('DOMContentLoaded', function() {

    // --- Conditional "Other Service" Field ---
    const servicesAvailedSelect = document.getElementById('services_availed');
    const otherServiceDiv = document.getElementById('other_service_div');
    const otherServiceInput = document.getElementById('other_service');

    function toggleOtherService() {
        // Check if the selected value in the dropdown is 'Others'
        if (servicesAvailedSelect.value === 'Others') {
            otherServiceDiv.classList.remove('hidden'); // Show the div
            otherServiceInput.required = true; // Make the input required
        } else {
            otherServiceDiv.classList.add('hidden'); // Hide the div
            otherServiceInput.required = false; // Make the input not required
            otherServiceInput.value = ''; // Clear the input value
        }
    }

    // Add event listener to the services dropdown
    if (servicesAvailedSelect) {
        servicesAvailedSelect.addEventListener('change', toggleOtherService);
    }
    // Initial check in case the page loads with "Others" pre-selected (unlikely with default)
    toggleOtherService();


    // --- Basic Signature Pad ---
    const canvas = document.getElementById('signatureCanvas');
    const canvasContainer = document.querySelector('.canvas-container');
    const clearButton = document.getElementById('clearSignatureBtn');
    const signatureDataInput = document.getElementById('signatureData');

    // Check if canvas exists before proceeding
    if (canvas && canvasContainer && clearButton && signatureDataInput) {
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
            clearCanvas(false); // Clear visually but keep data if resizing during signing (might need redraw logic for perfection)
            setContextStyle(); // Re-apply drawing style after resize/clear
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
            let clientX, clientY;
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            // Adjust coordinates relative to the canvas element
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }

        function startDrawing(e) {
            e.preventDefault(); // Prevent page scroll on touch
            isDrawing = true;
            const coords = getCoordinates(e);
            [lastX, lastY] = [coords.x, coords.y];
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault(); // Prevent page scroll on touch
            const coords = getCoordinates(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            [lastX, lastY] = [coords.x, coords.y];
            hasSigned = true; // Mark that drawing has occurred
        }

        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            // Store the signature as a Data URL if something was drawn
            if (hasSigned) {
                // Use PNG for better quality, or JPEG for smaller size
                signatureDataInput.value = canvas.toDataURL('image/png');
                // signatureDataInput.value = canvas.toDataURL('image/jpeg', 0.8); // Lower quality JPEG
            }
        }

        function clearCanvas(clearData = true) {
            // Use scaled dimensions for clearing
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
            setContextStyle(); // Need to reset style after clearing
            if (clearData) {
                signatureDataInput.value = '';
                hasSigned = false; // Reset signed status
            }
        }

        // Initial setup
        resizeCanvas(); // Size canvas initially
        setContextStyle(); // Set initial style

        // Event Listeners
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing); // Stop if mouse leaves canvas

        // Touch events for mobile
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing); // Handle interruption

        clearButton.addEventListener('click', () => clearCanvas(true));

        // Resize listener
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            // Debounce resize event to avoid excessive calls
            resizeTimeout = setTimeout(resizeCanvas, 150);
        });

    } else {
        console.warn("Signature pad elements not found. Skipping signature pad setup.");
    }


    // --- Form Submission Handling ---
    // Make handleSubmit globally accessible if called via onsubmit attribute
    window.handleSubmit = function(event) {
        event.preventDefault(); // Prevent default form submission

        const form = document.getElementById('registrationForm');
        const termsCheckbox = document.getElementById('termsCheckbox');
        const signatureRequired = true; // Set to false if signature is optional

        // Custom validation flags
        let isValid = true;
        let firstInvalidElement = null;

        // 1. Check Signature (if required)
        if (signatureRequired && canvas && !hasSigned) { // Check canvas exists too
            alert('Please provide your signature.');
            if(canvasContainer) canvasContainer.style.borderColor = '#ef4444'; // Highlight canvas area (red)
            isValid = false;
            if (!firstInvalidElement && canvasContainer) firstInvalidElement = canvasContainer;
        } else if (canvasContainer) {
            canvasContainer.style.borderColor = '#d1d5db'; // Reset border
        }

        // 2. Check Terms Agreement
        if (termsCheckbox && !termsCheckbox.checked) {
            alert('You must agree to the Terms & Conditions to register.');
            // Highlight the terms group visually
             if (termsCheckbox.parentElement) {
                termsCheckbox.closest('.terms-group').style.outline = '1px solid #ef4444'; // Red outline
                termsCheckbox.closest('.terms-group').style.outlineOffset = '2px';
             }
            isValid = false;
            if (!firstInvalidElement && termsCheckbox) firstInvalidElement = termsCheckbox.closest('.terms-group') || termsCheckbox;
        } else if (termsCheckbox && termsCheckbox.parentElement) {
            termsCheckbox.closest('.terms-group').style.outline = 'none'; // Reset outline
        }

        // 3. Check standard HTML5 validation (required fields, types, etc.)
        if (!form.checkValidity()) {
             isValid = false;
             // Find the first invalid standard input/select
             const invalidStandardInput = form.querySelector(':invalid');
             if (!firstInvalidElement && invalidStandardInput) {
                 firstInvalidElement = invalidStandardInput;
                 // Optionally, add a visual cue to the invalid standard input
                 invalidStandardInput.style.borderColor = '#ef4444';
                 // You might want a more robust way to highlight/remove this highlight later
             }
             // Trigger browser's default validation UI for standard fields
             form.reportValidity();
        }

        // If form is not valid, scroll to the first error and stop
        if (!isValid) {
            if (firstInvalidElement) {
                firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return; // Stop the submission process
        }

        // --- If all validation passes ---
        console.log('Form validation passed!');

        // Gather form data
        const formData = new FormData(form);

        console.log('--- Form Data ---');
         for (let [key, value] of formData.entries()) {
             // Special handling for signature data for concise logging
             if (key === 'signatureData' && value.startsWith('data:image')) {
                 console.log(`${key}: [Data URL starting with ${value.substring(0,30)}...]`);
             }
             // Log 'other_service' only if 'services_availed' is 'Others'
             else if (key === 'other_service' && formData.get('services_availed') !== 'Others') {
                // Optionally skip logging empty/irrelevant other_service
                continue;
             }
              else {
                 console.log(`${key}: ${value}`);
             }
        }
        console.log('-----------------');

        // Simulate submission success
        alert('Registration successful (simulation)! Check the browser console for data.');

        // ---- In a real application, send data to the server ----
        // fetch('/your-backend-endpoint', {
        //     method: 'POST',
        //     body: formData
        // })
        // .then(response => response.json())
        // .then(data => {
        //     console.log('Success:', data);
        //     alert('Registration successful!');
        //     // Optionally redirect or reset form
        //     // form.reset();
        //     // clearCanvas(true);
        //     // toggleOtherService(); // Re-check conditional fields
        // })
        // .catch((error) => {
        //     console.error('Error:', error);
        //     alert('An error occurred during registration.');
        // });
        // ---------------------------------------------------------

        // Optional: Reset form after successful *simulated* submission
        // form.reset();
        // if (canvas) clearCanvas(true); // Clear signature if canvas exists
        // toggleOtherService(); // Reset conditional field visibility
        // if (termsCheckbox && termsCheckbox.parentElement) { // Reset terms outline
        //     termsCheckbox.closest('.terms-group').style.outline = 'none';
        // }
        // if (canvasContainer) canvasContainer.style.borderColor = '#d1d5db'; // Reset canvas border
    }
});