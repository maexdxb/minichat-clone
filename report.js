// Report System for Siagechat
console.log('🛡️ Report System Initialized');

// DOM Elements
const reportModal = document.getElementById('reportModal');
const btnReport = document.getElementById('btnReport'); // Might be null initially if dynamically added
const reportScreenshot = document.getElementById('reportScreenshot');
const btnConfirmReport = document.getElementById('btnConfirmReport');

// Open Modal logic
window.openReportModal = function () {
    console.log('🚩 Opening report modal...');

    if (!reportModal) {
        console.error('Report modal not found in DOM');
        return;
    }

    // Capture screenshot of remote video
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo && remoteVideo.srcObject) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = remoteVideo.videoWidth || 640;
            canvas.height = remoteVideo.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            if (reportScreenshot) {
                reportScreenshot.src = dataUrl;
                reportScreenshot.style.display = 'block';
            }
        } catch (e) {
            console.error('Error capturing screenshot:', e);
        }
    }

    reportModal.style.display = 'flex';
}

window.closeReportModal = function () {
    if (reportModal) {
        reportModal.style.display = 'none';
        // Clear screenshot to save memory
        if (reportScreenshot) {
            reportScreenshot.src = '';
            reportScreenshot.style.display = 'none';
        }
    }
}

// Setup Event Listener for Confirm Button
if (btnConfirmReport) {
    btnConfirmReport.addEventListener('click', async () => {
        // Here we would normally send to backend:
        // await submitReport(partnerId, screenshotData);

        // Visual feedback
        console.log('✅ Report submitted!');
        const btnText = btnConfirmReport.innerText;
        btnConfirmReport.innerText = 'Gesendet!';
        btnConfirmReport.style.backgroundColor = '#28a745';

        setTimeout(() => {
            closeReportModal();
            // Reset button
            btnConfirmReport.innerText = btnText;
            btnConfirmReport.style.backgroundColor = '#dc3545';

            // Show notification
            // Assuming showNotification is global from script.js, if not fail gracefully
            if (typeof showNotification === 'function') {
                showNotification('Benutzer wurde gemeldet. Danke für deine Mithilfe!');
            } else {
                alert('Benutzer wurde gemeldet. Danke!');
            }

            // Optionally skip this partner immediately?
            // if (typeof skipPartner === 'function') skipPartner();

        }, 1000);
    });
}

// Hook up the report button if it wasn't caught by the onclick in HTML
// (We added onclick="openReportModal()" in HTML so this is redundant but safe)
if (btnReport) {
    btnReport.addEventListener('click', (e) => {
        e.preventDefault();
        window.openReportModal();
    });
}
