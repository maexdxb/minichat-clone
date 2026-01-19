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
        const btnText = btnConfirmReport.innerText;
        btnConfirmReport.innerText = 'Sende...';
        btnConfirmReport.disabled = true;

        try {
            // Prepare Data
            const screenshotData = reportScreenshot.src; // Base64
            // We assume authenticated user
            let reporterId = null;
            if (window.authManager && window.authManager.currentUser) {
                reporterId = window.authManager.currentUser.id;
            }

            // Send to Supabase
            if (window.authManager && window.authManager.supabase) {
                const reportedUserId = (window.webrtcManager && window.webrtcManager.partnerSupabaseId) ?
                    window.webrtcManager.partnerSupabaseId : null;

                console.log('🛡️ Submitting report for user:', reportedUserId);

                const { error } = await window.authManager.supabase
                    .from('reports')
                    .insert({
                        reporter_id: reporterId,
                        reported_user_id: reportedUserId,
                        reason: 'Unangemessenes Verhalten',
                        screenshot: screenshotData,
                        status: 'pending' // pending, reviewed
                    });

                if (error) {
                    console.error('❌ Supabase Report Error:', error);
                    showNotification('Fehler beim Senden der Meldung! ❌');
                } else {
                    console.log('✅ Report saved to database successfully!');
                }
            }
        } catch (err) {
            console.error('Report submission error:', err);
        }

        // Visual feedback
        console.log('✅ Report submitted!');
        btnConfirmReport.innerText = 'Gesendet!';
        btnConfirmReport.style.backgroundColor = '#28a745';

        setTimeout(() => {
            closeReportModal();
            // Reset button
            btnConfirmReport.innerText = btnText;
            btnConfirmReport.style.backgroundColor = '#dc3545';
            btnConfirmReport.disabled = false;

            // Show notification
            if (typeof showNotification === 'function') {
                showNotification('Benutzer wurde gemeldet. Danke für deine Mithilfe!');
            } else {
                alert('Benutzer wurde gemeldet. Danke!');
            }

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
