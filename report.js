// Reporting System Logic

const reportModal = document.getElementById('reportModal');
const reportScreenshot = document.getElementById('reportScreenshot');
const btnReport = document.getElementById('btnReport'); // Matches HTML ID
const btnConfirmReport = document.getElementById('btnConfirmReport'); // Matches HTML ID

// Open Modal logic
window.openReportModal = function () {
    console.log('🚩 openReportModal triggered');

    if (!reportModal) {
        console.error('❌ reportModal Element nicht gefunden!');
        return;
    }

    // Reset previous input
    const reasonInput = document.getElementById('reportReason');
    if (reasonInput) reasonInput.value = '';

    // Capture screenshot of remote video
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo && remoteVideo.srcObject) {
        console.log('📸 Versuche Screenshot zu erstellen...');
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
                console.log('✅ Screenshot erstellt');
            }
        } catch (e) {
            console.error('❌ Fehler beim Screenshot:', e);
        }
    } else {
        console.warn('⚠️ Kein remoteVideoStream. Nutze Platzhalter.');
        // Generate Placeholder functionality for testing/errors
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#666';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Kein Videosignal', 320, 240);

        if (reportScreenshot) {
            reportScreenshot.src = canvas.toDataURL('image/jpeg');
            reportScreenshot.style.display = 'block';
        }
    }

    reportModal.style.display = 'flex';
    console.log('🔓 Modal sichtbar gemacht');
}

window.closeReportModal = function () {
    console.log('🔒 Schließe Modal');
    if (reportModal) {
        reportModal.style.display = 'none';
        if (reportScreenshot) {
            reportScreenshot.src = '';
            reportScreenshot.style.display = 'none';
        }
    }
}

// Setup Event Listener for Confirm Button
if (btnConfirmReport) {
    console.log('✅ Found btnConfirmReport, attaching listener');
    btnConfirmReport.onclick = async () => {
        console.log('🔘 btnConfirmReport GEKLICKT!');
        const btnText = btnConfirmReport.innerText;
        btnConfirmReport.innerText = 'Sende...';
        btnConfirmReport.disabled = true;

        try {
            const screenshotData = reportScreenshot.src;
            let reporterId = null;
            if (window.authManager && window.authManager.currentUser) {
                reporterId = window.authManager.currentUser.id;
            }
            console.log('👤 Reporter ID:', reporterId);

            if (window.authManager && window.authManager.supabase) {
                // EXTREME DEBUGGING
                console.log('🔍 DEBUG REPORTING:');
                console.log(' - window.webrtcManager:', window.webrtcManager);
                if (window.webrtcManager) {
                    console.log(' - window.webrtcManager.partnerSupabaseId:', window.webrtcManager.partnerSupabaseId);
                }

                // BRUTE FORCE READ
                const reportedUserId = window.CURRENT_PARTNER_ID;

                if (!reportedUserId) {
                    console.error('❌ CRITICAL: reportedUserId IS NULL! Report will be anonymous.');
                    // alert('ACHTUNG: Partner-ID konnte nicht ermittelt werden (Gast?).');
                } else {
                    console.log('✅ reportedUserId found:', reportedUserId);
                }

                console.log('🛡️ Sende Report an Supabase für User:', reportedUserId);

                const reasonText = document.getElementById('reportReason') ? document.getElementById('reportReason').value : 'Unangemessenes Verhalten';

                const { error } = await window.authManager.supabase
                    .from('reports')
                    .insert({
                        reporter_id: reporterId,
                        reported_user_id: reportedUserId,
                        reason: reasonText || 'Unangemessenes Verhalten',
                        screenshot: screenshotData,
                        status: 'pending'
                    });

                if (error) {
                    console.error('❌ Supabase Report Error:', error);
                    alert('Fehler: ' + error.message);
                } else {
                    console.log('✅ Report erfolgreich gespeichert!');
                }
            } else {
                console.error('❌ Supabase Client nicht gefunden!');
            }
        } catch (err) {
            console.error('❌ Report submission error:', err);
        }

        btnConfirmReport.innerText = 'Gesendet!';
        btnConfirmReport.style.backgroundColor = '#28a745';

        setTimeout(() => {
            closeReportModal();
            btnConfirmReport.innerText = btnText;
            btnConfirmReport.style.backgroundColor = '#dc3545';
            btnConfirmReport.disabled = false;
            showNotification('Benutzer wurde gemeldet.');
        }, 1000);
    };
} else {
    console.error('❌ btnConfirmReport nicht im DOM gefunden!');
}

// Hook up the report button
if (btnReport) {
    console.log('✅ Found btnReport (Overlay), attaching listener');
    btnReport.onclick = (e) => {
        console.log('🔘 btnReport (Overlay) GEKLICKT!');
        e.preventDefault();
        window.openReportModal();
    };
} else {
    console.log('⏳ btnReport (Overlay) noch nicht da, warte...');
}
