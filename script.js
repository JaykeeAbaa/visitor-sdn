document.addEventListener('DOMContentLoaded', function() {

    // --- Conditional "Other Service" Field ---
    const servicesAvailedSelect = document.getElementById('services_availed');
    const otherServiceDiv = document.getElementById('other_service_div');
    const otherServiceInput = document.getElementById('other_service');

    function toggleOtherService() {
        if (servicesAvailedSelect && servicesAvailedSelect.value === 'Others') { // Added check for select existence
            if(otherServiceDiv) otherServiceDiv.classList.remove('hidden'); // Show the div
            if(otherServiceInput) otherServiceInput.required = true; // Make the input required
        } else {
            if(otherServiceDiv) otherServiceDiv.classList.add('hidden'); // Hide the div
            if(otherServiceInput) {
                otherServiceInput.required = false; // Make the input not required
                otherServiceInput.value = ''; // Clear the input value
            }
        }
    }

    if (servicesAvailedSelect) {
        servicesAvailedSelect.addEventListener('change', toggleOtherService);
        toggleOtherService(); // Initial check
    }


    // --- Basic Signature Pad ---
    const canvas = document.getElementById('signatureCanvas');
    const canvasContainer = document.querySelector('.canvas-container');
    const clearButton = document.getElementById('clearSignatureBtn');
    const signatureDataInput = document.getElementById('signatureData');
    let hasSigned = false; // Moved here to be accessible in handleSubmit even if canvas fails

    if (canvas && canvasContainer && clearButton && signatureDataInput) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        function resizeCanvas() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvasContainer.offsetWidth * ratio;
            canvas.height = canvasContainer.offsetHeight * ratio;
            canvas.style.width = `${canvasContainer.offsetWidth}px`;
            canvas.style.height = `${canvasContainer.offsetHeight}px`;
            ctx.scale(ratio, ratio);
            // Note: Redrawing existing signature on resize is complex and omitted.
            // Clear or prompt user if resizing happens mid-signature? For now, just clears visually.
            clearCanvas(false);
            setContextStyle();
        }

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
                signatureDataInput.value = canvas.toDataURL('image/png');
            }
        }

        function clearCanvas(clearData = true) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
            setContextStyle();
            if (clearData) {
                signatureDataInput.value = '';
                hasSigned = false;
            }
        }

        resizeCanvas();
        setContextStyle();

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        clearButton.addEventListener('click', () => clearCanvas(true));

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 150);
        });

    } else {
        console.warn("Signature pad elements not found. Skipping signature pad setup.");
    }


    // --- Form Submission Handling ---
    window.handleSubmit = function(event) {
        event.preventDefault();

        const form = document.getElementById('registrationForm');
        // const termsCheckbox = document.getElementById('termsCheckbox'); // REMOVED
        const signatureRequired = true; // Keep true if signature is mandatory

        let isValid = true;
        let firstInvalidElement = null;

        // 1. Check Signature (if required)
        if (signatureRequired && canvas && !hasSigned) {
            alert('Please provide your signature.');
            if(canvasContainer) canvasContainer.style.borderColor = '#ef4444';
            isValid = false;
            if (!firstInvalidElement && canvasContainer) firstInvalidElement = canvasContainer;
        } else if (canvasContainer) {
            canvasContainer.style.borderColor = '#d1d5db';
        }

        // 2. Check Terms Agreement - REMOVED
        // if (termsCheckbox && !termsCheckbox.checked) { ... }

        // 3. Check standard HTML5 validation
        if (!form.checkValidity()) {
             isValid = false;
             const invalidStandardInput = form.querySelector(':invalid');
             if (!firstInvalidElement && invalidStandardInput) {
                 firstInvalidElement = invalidStandardInput;
                 // Optional visual cue for standard invalid fields (browser usually handles this)
                 // invalidStandardInput.style.borderColor = '#ef4444';
             }
             form.reportValidity(); // Trigger browser's built-in validation messages
        }

        // If form is not valid, scroll to the first error and stop
        if (!isValid) {
            if (firstInvalidElement) {
                // Small delay might help ensure layout changes (like error messages appearing) are done
                setTimeout(() => {
                     firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            return;
        }

        // --- If all validation passes ---
        console.log('Form validation passed!');
        const formData = new FormData(form);

        console.log('--- Form Data ---');
         for (let [key, value] of formData.entries()) {
             if (key === 'signatureData' && value.startsWith('data:image')) {
                 console.log(`${key}: [Data URL starting with ${value.substring(0,30)}...]`);
             }
             else if (key === 'other_service' && formData.get('services_availed') !== 'Others') {
                continue; // Skip logging empty/irrelevant other_service
             }
             // Handle the checkbox state: 'is_first_visit' will only be present if checked
             else if (key === 'is_first_visit') {
                 console.log(`${key}: ${value}`); // Will log 'true' if checked
             }
              else {
                 console.log(`${key}: ${value}`);
             }
        }
        // If the checkbox wasn't checked, 'is_first_visit' won't appear here.
        // You might want to explicitly check its state if needed server-side or elsewhere:
        // const isFirstVisitChecked = document.getElementById('isFirstVisit')?.checked || false;
        // console.log(`Is First Visit (explicit check): ${isFirstVisitChecked}`);
        console.log('-----------------');

        alert('Registration successful (simulation)! Check the browser console for data.');

        // Optional: Reset form after successful simulated submission
        // form.reset();
        // if (canvas) clearCanvas(true);
        // toggleOtherService();
        // if (canvasContainer) canvasContainer.style.borderColor = '#d1d5db';
    }
});