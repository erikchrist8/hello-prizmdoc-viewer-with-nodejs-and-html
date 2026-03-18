let viewerControl = null;

$(function() {
    // Listen for dropdown changes
    $('#documentDropdown').on('change', function() {
        const selectedFile = $(this).val();
        if (!selectedFile) return;

        // 1. Request a new Viewing Session from YOUR backend.
        // Your backend should POST to PAS to create the session and upload the file.
        // 1. Request a new Viewing Session from YOUR backend.
        $.ajax({
            url: '/create-session',
            method: 'POST',
            data: { fileName: selectedFile },
            success: function(response) {
                const newViewingSessionId = response.viewingSessionId;
                
                // 2. Update or Initialize the Viewer
                if (viewerControl) {
                    // If the viewer already exists, swap the session seamlessly.
                    // If you intend to return to the current viewing session in the future, set isRestorable to true
                    // changeViewingSession(newViewingSessionId, isRestorable);
                    viewerControl.changeViewingSession(newViewingSessionId, false)
                        .on(PCCViewer.EventType.ViewingSessionChanged, function(ev) {
                            console.log("Successfully switched to: " + selectedFile);
                        });
                } else {
                    // If this is the first file loaded, instantiate the viewer.
                    initializeViewer(newViewingSessionId);
                }
            },
            error: function(err) {
                alert("Failed to create viewing session for " + selectedFile);
            }
        });
    });
});

// Initializes the Viewer plugin inside the #viewerContainer
function initializeViewer(viewingSessionId) {
    viewerControl = $('#viewerContainer').pccViewer({
        documentID: viewingSessionId,
        imageHandlerUrl: '/pas-proxy', // Assumes a reverse proxy to PAS is configured
        viewerAssetsPath: 'viewer-assets',
        resourcePath: 'viewer-assets/img',
        language: viewerCustomizations.languages['en-US'],
        template: viewerCustomizations.template,
        icons: viewerCustomizations.icons,
        annotationsMode: "LayeredAnnotations"
    }).viewerControl;
}