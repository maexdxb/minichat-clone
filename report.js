// Report System for Siagechat
console.log('🛡️ Report System Initialized');

// DOM Elements
const reportModal = document.getElementById('reportModal');
const btnReport = document.getElementById('btnReport'); // Might be null initially if dynamically added
const reportScreenshot = document.getElementById('reportScreenshot');
const btnConfirmReport = document.getElementById('btnConfirmReport');

// Open Modal logic
window.openReportModal = function () {
    console.log('🚩 openReportModal triggered');

    if (!reportModal) {
        console.error('❌ reportModal Element nicht gefunden!');
        return;
    }

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
        console.warn('⚠️ Kein remoteVideo oder srcObject gefunden für Screenshot');
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

                // Try to get ID from global variable if manager property is missing (fallback)
                const reportedUserId = (window.webrtcManager && window.webrtcManager.partnerSupabaseId) ?
                    window.webrtcManager.partnerSupabaseId : null;

                if (!reportedUserId) {
                    console.error('❌ CRITICAL: reportedUserId IS NULL! Report will be anonymous.');
                    alert('ACHTUNG: Partner-ID konnte nicht ermittelt werden (Gast?).');
                } else {
                    console.log('✅ reportedUserId found:', reportedUserId);
                }

                console.log('🛡️ Sende Report an Supabase für User:', reportedUserId);

                const { error } = await window.authManager.supabase
                    .from('reports')
                    .insert({
                        reporter_id: reporterId,
                        reported_user_id: reportedUserId,
                        reason: 'Unangemessenes Verhalten',
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
